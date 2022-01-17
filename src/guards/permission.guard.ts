import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { IncomingMessage } from "http"
import { LoggerService } from "../logger/logger.service"

/**
 * 强制校验SECRET的有效性
 */
@Injectable()
export class checkSecretGuard implements CanActivate {
	constructor() {}

	logger = new LoggerService()

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<IncomingMessage>()
		const header = request.headers || {}
		const userAgent = header["user-agent"] || header["User-Agent"]
		const SECRET = header["x-gitlab-token"]
		if (SECRET === process.env.SERVICE_SECRET) {
			return true
		}
		/*
		 * 校验不通过写入日志
		 * */
		const writeContent = `访问被拒绝,SECRET秘钥不通过\nHost:  ${header.host},  URL:  ${request.url},  Method:  ${request.method}\nuserAgent:  ${userAgent}`
		this.logger.write("warning", writeContent)
	}
}
