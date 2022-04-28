import { Module, HttpModule } from "@nestjs/common"
import { SelfNoticeController } from "./selfNotice.controller"
import { SelfNoticeService } from "./selfNotice.service"
import { publicImportsForRoot } from "../../config/publicImports"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"
import { TIMEOUT } from "../../config/startConfig"

@Module({
	imports: [publicImportsForRoot(), HttpModule.register({ timeout: TIMEOUT })],
	controllers: [SelfNoticeController],
	providers: [SelfNoticeService, NoticeWecomService]
})
export class SelfNoticeModule {}
