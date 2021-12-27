import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { CacheModule } from "../cache/cache.module"
import { publicImportsForRoot } from "../config/publicImports"
import { QueueModule } from "../queue/queue.module"

// 其他业务的注册
import { CzbGitNoticeModule } from "../business/czbGitNotice/czbGitNotice.module"
// 公用和业务模块
const businessModules = [CzbGitNoticeModule]

@Module({
	imports: [
		// 注册环境变量
		publicImportsForRoot(),
		// 前置注册Redis服务
		CacheModule,
		// 前置注册队列服务
		QueueModule,
		// 注册所有公用业务
		...businessModules
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
