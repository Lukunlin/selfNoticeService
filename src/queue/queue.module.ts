import { Module, Global } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { QueueService } from "./queue.service"
import { NoticeMsgProcessor } from "./queue.processor"

/**
 * 注册到redis的配置
 */
export const register: any = () => {
	return BullModule.registerQueue({
		name: "noticeMsg",
		redis: {
			db: 0,
			keyPrefix: "selfNotice_",
			host: process.env.DATABASE_REDIS_HOST,
			port: Number(process.env.DATABASE_REDIS_PORT),
			password: process.env.DATABASE_REDIS_PASSWORD
		}
	})
}

/**
 * 全局注册队列服务 -> app.modules.ts
 */
@Global()
@Module({
	imports: [register()],
	controllers: [],
	providers: [QueueService, NoticeMsgProcessor],
	exports: [QueueService, NoticeMsgProcessor]
})
export class QueueModule {}
