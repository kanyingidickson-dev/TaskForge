function format(level, msg, meta) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  return JSON.stringify(line);
}

const logger = {
  info(meta, msg) {
    if (typeof meta === 'string') {
      console.log(format('info', meta));
      return;
    }

    console.log(format('info', msg, meta));
  },

  error(meta, msg) {
    if (typeof meta === 'string') {
      console.error(format('error', meta));
      return;
    }

    console.error(format('error', msg, meta));
  },
};

module.exports = { logger };
