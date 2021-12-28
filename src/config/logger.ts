import * as log4js from "log4js"

export const selfLayout = {
	type: "pattern",
	pattern: `[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p | %c]%n------ host: %h | pid: %z ---------%n%m%n-----------------------------------------------%n`
}
/*
 * 配置信息
 * */
export const loggerConfig = {
	appenders: {
		console: {
			type: "console"
		},
		statistics: {
			type: "file",
			filename: "./logs/application.log",
			maxLogSize: 20 * 1024 * 1024,
			backups: 20,
			layout: selfLayout
		},
		access: {
			type: "dateFile",
			filename: "./logs/access/date",
			pattern: "yyyy-MM-dd-hh.log",
			compress: true,
			encoding: "utf-8",
			alwaysIncludePattern: true,
			layout: selfLayout
		},
		warning: {
			type: "file",
			filename: "./logs/warning/warning.log",
			maxLogSize: 12 * 1024 * 1024,
			backups: 15,
			layout: selfLayout
		},
		error: {
			type: "file",
			filename: "./logs/warning/error.log",
			maxLogSize: 12 * 1024 * 1024,
			backups: 15,
			layout: selfLayout
		},
		fatal: {
			type: "file",
			filename: "./logs/warning/fatal.log",
			maxLogSize: 12 * 1024 * 1024,
			backups: 15,
			layout: selfLayout
		}
	},
	// 定义类型
	categories: {
		default: {
			appenders: ["statistics"],
			level: "debug"
		},
		access: {
			appenders: ["access"],
			level: "info"
		},
		warn: {
			appenders: ["warning"],
			level: "warn"
		},
		err: {
			appenders: ["error", "fatal"],
			level: "error"
		},
		fat: {
			appenders: ["fatal"],
			level: "fatal"
		}
	}
}

/*
 * 出口经过默认配置的实例方法
 * */
export const loggerSign = log4js.configure(loggerConfig)
/*
 * 出口获指定类别的实例logger
 * */
export const logger = loggerSign.getLogger
