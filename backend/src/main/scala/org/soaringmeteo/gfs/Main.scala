package org.soaringmeteo.gfs

import cats.syntax.apply._
import com.monovore.decline.{CommandApp, Opts}
import org.slf4j.LoggerFactory
import PathArgument.pathArgument
import org.soaringmeteo.gfs.out.{InitDateString, Store, runTargetPath, versionedTargetPath}

import java.util.concurrent.TimeoutException
import scala.concurrent.{Await, Future}
import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.control.NonFatal

object Main extends CommandApp(
  "soaringmeteo",
  "Download weather data, extract the relevant information for soaring pilots, and produce JSON data from it",
  main = {
    val gribsDir         = Opts.argument[os.Path]("GRIBs directory")
    val jsonDir          = Opts.argument[os.Path]("JSON directory")

    val gfsRunInitTime = Opts.option[String](
      "gfs-run-init-time",
      "Initialization time of the GFS forecast to download ('00', '06', '12', or '18').",
      "t"
    )
      .validate("Valid values are '00', '06', '12', and '18'")(Set("00", "06", "12", "18"))
      .orNone

    val reusePreviousGribFiles = Opts.flag(
      "reuse-previous-grib-files",
      "Reuse the previously downloaded GRIB files instead of downloading them again.",
      "r"
    ).orFalse

    (gribsDir, jsonDir, gfsRunInitTime, reusePreviousGribFiles).mapN(Soaringmeteo.run)
  }
)

object Soaringmeteo {
  private val logger = LoggerFactory.getLogger(getClass)

  def run(
    gribsDir: os.Path,
    jsonDir: os.Path,
    maybeGfsRunInitTime: Option[String],
    reusePreviousGribFiles: Boolean
  ): Unit = {
    val exitStatus =
      try {
        resetDatabaseIfNeeded(Store.ensureSchemaExists(), 20.seconds)
        val subgrids = Settings.gfsSubgrids
        val gfsRun = in.ForecastRun.findLatest(maybeGfsRunInitTime)
        if (!reusePreviousGribFiles) {
          logger.info("Removing old data")
          os.remove.all(gribsDir)
          resetDatabaseIfNeeded(Store.deleteAll(), 60.seconds)
          ()
        }
        val forecastGribsDir = gfsRun.storagePath(gribsDir)
        val versionedTargetDir = versionedTargetPath(jsonDir)
        val runTargetDir = runTargetPath(versionedTargetDir, InitDateString(gfsRun.initDateTime))
        os.makeDir.all(runTargetDir)
        DataPipeline(forecastGribsDir, runTargetDir, gfsRun, subgrids, reusePreviousGribFiles)
        JsonWriter.writeJsons(versionedTargetDir, gfsRun)
        logger.info("Done")
        0
      } catch {
        case NonFatal(error) =>
          logger.error("Failed to run soaringmeteo", error)
          1
      } finally {
        Store.close()
      }
    System.exit(exitStatus)
  }

  def resetDatabaseIfNeeded[A](result: Future[A], timeout: Duration): Unit =
    try {
      Await.result(result, timeout)
      ()
    } catch {
      case _: TimeoutException =>
        logger.error("Possibly corrupted database.")
        os.remove(os.pwd / "data.mv.db")
        ()
    }
}
