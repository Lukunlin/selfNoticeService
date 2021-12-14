import { Controller, Get, Query, All } from "@nestjs/common"
import { ApiBody, ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger"
import { CzbGitNoticeService } from "./czbGitNotice.service"

@Controller("/czbGitNotice")
export class CzbGitNoticeController {
	constructor(private readonly appService: CzbGitNoticeService) {}

	@All()
	@ApiTags("czb项目推送服务")
	@ApiOperation({ summary: "czb项目推送服务", description: "用户对czb项目内的Gitlab触发了保护分支的推送" })
	pushNotice(@Query() parems: any = {}) {
		return parems
		// return this.appService.pushNotice()
	}
}
