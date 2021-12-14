import { NestFactory } from "@nestjs/core"
import { AppModule } from "./index/app.module"
import { dependency } from "./middlewares/dependency"
import { PORT } from "./config/startConfig"

async function startService() {
	const app = await NestFactory.create(AppModule)
	dependency(app)
	await app.listen(PORT)
}
startService()
