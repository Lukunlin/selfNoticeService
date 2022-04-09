import { Module, HttpModule } from "@nestjs/common"
import { CzbGitNoticeController } from "./czbGitNotice.controller"
import { CzbGitNoticeService } from "./czbGitNotice.service"
import { publicImportsForRoot } from "../../config/publicImports"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"
import { LoggerModule } from "../../logger/logger.module"
import { TIMEOUT } from "../../config/startConfig"

@Module({
	imports: [publicImportsForRoot(), HttpModule.register({ timeout: TIMEOUT }), LoggerModule],
	controllers: [CzbGitNoticeController],
	providers: [CzbGitNoticeService, NoticeWecomService]
})
export class CzbGitNoticeModule {}
