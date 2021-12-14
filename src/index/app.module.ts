import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { publicImportsForRoot } from "../config/publicImports"

// 其他业务的注册
import { CzbGitNoticeModule } from "../business/czbGitNotice/czbGitNotice.module"
// 公用和业务模块
const businessModules = [CzbGitNoticeModule]

@Module({
	imports: [publicImportsForRoot(), ...businessModules],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
