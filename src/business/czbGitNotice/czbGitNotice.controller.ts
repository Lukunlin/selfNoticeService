import { Controller, Post, Body, Headers, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation } from "@nestjs/swagger"
import { checkSecretGuard } from "../../guards/permission.guard"
import { CzbGitNoticeService } from "./czbGitNotice.service"

@Controller("/czbGitNotice")
@UseGuards(checkSecretGuard)
export class CzbGitNoticeController {
	constructor(private readonly appService: CzbGitNoticeService) {}

	@Post()
	@ApiTags("czb项目推送服务")
	@ApiOperation({ summary: "czb项目推送服务", description: "用户对czb项目内的Gitlab触发了保护分支的推送" })
	async pushNotice(@Body() body, @Headers() header) {
		return {
			request: body,
			headers: header
		}
		// return await this.appService.pushNotice(body)
	}
}
