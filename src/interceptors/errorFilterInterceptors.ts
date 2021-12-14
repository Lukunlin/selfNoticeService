import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common"
import { Response } from "express"
import { isDev, isDebug } from "../utils/common"
import { IResponse } from "../../types"

@Catch(HttpException)
export class ErrorFilterInterceptors implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const res: any = exception.getResponse()
		const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
		let message = res.message || exception.message
		try {
			if (Array.isArray(message)) {
				message = message[0]
			} else if (Object.prototype.toString.apply(message) === "[object Object]") {
				message = message.message || message.msg || message.info || message.error
			}
		} catch (e) {}
		const resultErrorJson: IResponse<null> = {
			status,
			data: null,
			info: message
		}
		if (isDev) {
			console.log("进入了错误拦截器")
			console.error(exception, "\n")
		}
		if (isDebug) {
			Logger.log(exception, "发生错误")
		}
		const Status_200 = status > 199 && status < 300
		const Status_400 = status > 399 && status < 500 && status !== 404
		const Status_self = status > 999
		const resStatusCode = Status_200 || Status_400 || Status_self ? 200 : status
		response.status(resStatusCode).json(resultErrorJson)
	}
}
