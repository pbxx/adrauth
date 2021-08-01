var chalk = require("chalk");
var globals = {
  infocolor: "#52c0f7",
  infocolordrk: "#51a1c9",
  warncolor: "#f7c052",
  warncolordrk: "#c29846",
  errcolor: "#eb3474",
  errcolordrk: "#bf3062",
};

module.exports = {
  logger: (fname) => {
    return {
      log: (...args) => {
        var logArgs = [
          chalk.hex(globals.infocolor).bold("[ INFO: " + fname + " ]"),
          ...args,
        ];
        console.log(...logArgs);
      },
      warn: (...args) => {
        var logArgs = [
          chalk.hex(globals.warncolor).bold("[ WARN: " + fname + " ]"),
          ...args,
        ];
        console.log(...logArgs);
      },
      error: (...args) => {
        var logArgs = [
          chalk.hex(globals.errcolor).bold("[ ERROR: " + fname + " ]"),
          ...args,
        ];
        console.log(...logArgs);
      },
    }
  },
}
