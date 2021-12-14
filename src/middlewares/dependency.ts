import * as Helmet from "helmet"
import * as rateLimit from "express-rate-limit"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { ValidationPipe } from "@nestjs/common"
import { ResponseInterceptor } from "../interceptors/responseInterceptor"
import { ErrorFilterInterceptors } from "../interceptors/errorFilterInterceptors"

export const dependency = (app) => {
	// 设置文档部分
	const swaggerOptions = new DocumentBuilder().setTitle("colinNotice").setDescription("colinNoticeOfApiService").setVersion("1.0").addBearerAuth().build()
	const document = SwaggerModule.createDocument(app, swaggerOptions)
	SwaggerModule.setup("devDoc", app, document)
	// 配置中间件
	app.use(Helmet())
	app.use(
		rateLimit({
			windowMs: 10 * 60 * 1000,
			max: 1000
		})
	)
	// 配置管道和拦截器
	app.useGlobalPipes(new ValidationPipe())
	app.useGlobalInterceptors(new ResponseInterceptor())
	app.useGlobalFilters(new ErrorFilterInterceptors())
}
