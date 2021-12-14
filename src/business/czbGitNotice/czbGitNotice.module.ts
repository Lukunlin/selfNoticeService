import { Module } from "@nestjs/common"
import { CzbGitNoticeController } from "./czbGitNotice.controller"
import { CzbGitNoticeService } from "./czbGitNotice.service"
import { publicImportsForRoot } from "../../config/publicImports"

@Module({
	imports: [publicImportsForRoot()],
	controllers: [CzbGitNoticeController],
	providers: [CzbGitNoticeService]
})
export class CzbGitNoticeModule {}
