import { Module, HttpModule } from "@nestjs/common"
import { CzbGitNoticeController } from "./czbGitNotice.controller"
import { CzbGitNoticeService } from "./czbGitNotice.service"
import { publicImportsForRoot } from "../../config/publicImports"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"
import { LoggerModule } from "../../logger/logger.module"

@Module({
	imports: [publicImportsForRoot(), HttpModule.register({ timeout: 5000 }), LoggerModule],
	controllers: [CzbGitNoticeController],
	providers: [CzbGitNoticeService, NoticeWecomService]
})
export class CzbGitNoticeModule {}
