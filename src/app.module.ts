import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { publicImportsForRoot } from "./config/publicImports"

@Module({
	imports: [publicImportsForRoot()],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
