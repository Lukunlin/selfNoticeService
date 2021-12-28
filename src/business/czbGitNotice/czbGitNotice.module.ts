import { Module, HttpModule } from "@nestjs/common"
import { CzbGitNoticeController } from "./czbGitNotice.controller"
import { CzbGitNoticeService } from "./czbGitNotice.service"
import { publicImportsForRoot } from "../../config/publicImports"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"

@Module({
	imports: [publicImportsForRoot(), HttpModule.register({ timeout: 5000 })],
	controllers: [CzbGitNoticeController],
	providers: [CzbGitNoticeService, NoticeWecomService]
})
export class CzbGitNoticeModule {}
