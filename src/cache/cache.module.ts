import { Module, Global } from "@nestjs/common"
import { RedisModule } from "nestjs-redis"
import { CacheService } from "./cache.service"
import { publicImportsForRoot } from "../config/publicImports"

/**
 * 注册到redis的配置
 */
export const register: any = () => {
	return RedisModule.register({
		host: process.env.DATABASE_REDIS_HOST,
		port: Number(process.env.DATABASE_REDIS_PORT),
		password: process.env.DATABASE_REDIS_PASSWORD,
		db: 0
	})
}

/**
 * 全局注册redis服务 -> app.modules.ts
 */
@Global()
@Module({
	imports: [
		/*
		 * 由于在当前这个阶段调用register函数还不在appModule前，所以在当前要拿到env环境变量需要单独调用publicImportsForRoot()进行前置注册
		 * */
		publicImportsForRoot(),
		register()
	],
	controllers: [],
	providers: [CacheService],
	exports: [CacheService]
})
export class CacheModule {}
