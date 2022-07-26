import { Controller, Post, Body, Headers, UseGuards, HttpCode } from "@nestjs/common"
import { ApiTags, ApiOperation } from "@nestjs/swagger"
import { checkSecretGuard } from "../../guards/permission.guard"
import { CzbGitNoticeService } from "./czbGitNotice.service"

@Controller("/czbGitNotice")
@UseGuards(checkSecretGuard)
export class CzbGitNoticeController {
	constructor(private readonly appService: CzbGitNoticeService) {}

	@Post("/gitPush")
	@ApiTags("czb项目推送服务")
	@ApiOperation({ summary: "czb项目推送服务", description: "用户对czb项目内的Gitlab触发了保护分支的推送" })
	@HttpCode(200)
	async pushNotice(@Body() body, @Headers() header) {
		return await this.appService.pushNewsToWecom(body)
	}

	@Post("/receiveProdNotice")
	@ApiTags("czb项目推送服务")
	@ApiOperation({ summary: "czb项目推送服务", description: "jenkins发布灰度和生产的通知" })
	@HttpCode(200)
	async receiveProdNotice(@Body() body, @Headers() header) {
		return await this.appService.pushProdNoticeToWecom(body)
	}

	@Post("/microExamineNotice")
	@ApiTags("czb项目推送服务")
	@ApiOperation({ summary: "czb项目推送服务", description: "用户对加油小程序的多平台提审后的一个通知服务" })
	@HttpCode(200)
	async microExamineNotice(@Body() body) {
		return await this.appService.pushMicroExamineToWecom(body)
	}
}
