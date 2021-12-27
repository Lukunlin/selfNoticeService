import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"

/**
 * 强制校验SECRET的有效性
 */
@Injectable()
export class checkSecretGuard implements CanActivate {
	constructor() {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const header = request.headers || {}
		const SECRET = header["x-gitlab-token"]
		console.log(header)
		console.log(`SECRET = ${SECRET}; process = ${process.env.SERVICE_SECRET}`)
		return SECRET === process.env.SERVICE_SECRET
	}
}
