const OS = require("os")
const CORE_COUNT = OS.cpus().length

module.exports = {
	apps: [
		{
			// 应用名
			name: "selfNoticeService",
			// 应用启动文件
			script: "dist/main.js",
			// 应用程序所在的目录
			cwd: "./",
			// 应用程序启动模式 fork单实例多进程 和 cluster多实例多进程
			exec_mode: "cluster",
			// 启用/禁用应用程序崩溃或退出时自动重启
			autorestart: true,
			// 是否启用监控模式
			watch: true,
			// 启动多少CPU核心数
			instances: CORE_COUNT === 1 ? 1 : CORE_COUNT - 1
		}
	]
}
