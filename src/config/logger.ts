type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface Logger {
  error: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
}

const serialize = (meta?: unknown) => {
  if (typeof meta === 'undefined') {
    return '';
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
};

const log = (level: LogLevel, message: string, meta?: unknown) => {
  const timestamp = new Date().toISOString();
  const payload = `[${timestamp}] [${level.toUpperCase()}] ${message}${serialize(meta)}`;
  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else if (level === 'debug') {
    // eslint-disable-next-line no-console
    console.debug(payload);
  } else {
    console.log(payload);
  }
};

export const logger: Logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

export default logger;

