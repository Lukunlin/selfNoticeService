import { Injectable, NestInterceptor, CallHandler, ExecutionContext, RequestTimeoutException } from "@nestjs/common"
import { map, tap } from "rxjs/operators"
import { IncomingMessage, ServerResponse } from "http"
import { Observable, throwError, TimeoutError } from "rxjs"
import { catchError, timeout } from "rxjs/operators"
import * as Md5 from "crypto-js/md5"
import * as Moment from "moment"
import { isDev, timeoutNumber } from "../utils/common"
import { LoggerService } from "../logger/logger.service"
import { IResponse } from "../../types"

// 实例化一些场外对象
const Logger = new LoggerService()

/**
 * 全局response的拦截器
 */
@Injectable()
export class HttpInterceptor<T> implements NestInterceptor<T, IResponse<T>> {
	intercept(context: ExecutionContext, next: CallHandler<T>): Observable<IResponse<T>> {
		const requestNow = Date.now()
		const ctx = context.switchToHttp()
		const req = ctx.getRequest<IncomingMessage>()
		const res = ctx.getResponse<ServerResponse>()
		const header = req.headers
		const userAgent = header["user-agent"] || header["User-Agent"] || header.userAgent
		const requestNowFomat = Moment().format("YYYY-MM-DD HH:mm:ss.SSS")
		const requestId = Md5(requestNowFomat).toString()

		try {
			/**
			 * 记录通用统计日志
			 */
			const ip = header["x-forwarded-for"] || header["X-Forwarded-For"] || header.xForwardedFor || "unknow"
			const reqAny = req as any
			const parsedUrl = reqAny._parsedUrl || {}
			const bodyToString = JSON.stringify(reqAny.body || {})
			const writeContent = `Host:  ${header.host},  URL:  ${req.url},  Method:  ${req.method},  RequestId:  ${requestId},  Ip: ${ip},  httpVersion: ${req.httpVersion}\nuserAgent:  ${userAgent}\nparams:  ${parsedUrl.params || "{}"},  query:  ${parsedUrl.query || "{}"},  body:  ${bodyToString}`
			Logger.write("default", writeContent)
			Logger.write("access", writeContent)
		} catch (firstErr) {
			console.error("写入日志失败")
		}
		if (isDev) {
			console.log(`开始时间 ${requestNowFomat} : ${requestNow}`)
		}

		return next
			.handle()
			.pipe(
				/**
				 * 设定超时时间,并中断后续
				 */
				timeout(timeoutNumber),
				catchError((err) => {
					Logger.write("warning", `Host:  ${req.headers.host},  URL:  ${req.url},  Method:  ${req.method}\ntimeout warning For RequestId With = "${requestId}"`)
					if (err instanceof TimeoutError) {
						return throwError(new RequestTimeoutException())
					}
					return throwError(err)
				})
			)
			.pipe(
				map((data): IResponse => {
					/**
					 * 处理response返回结果和格式
					 */
					if (typeof data === "function") {
						/**
						 * 自定义特殊处理,如果拿到最终返回结果为一个函数,则直接使用函数返回值作为返回结果
						 */
						return data(ctx, res)
					}
					return {
						data,
						status: res.statusCode,
						info: "success",
						requestId
					}
				})
			)
			.pipe(
				tap((dataResult) => {
					/**
					 * 对最后结果的日志收集
					 */
					const responseNow = Date.now()
					const responseNowFomat = Moment().format("YYYY-MM-DD HH:mm:ss.SSS")
					const useTimer = responseNow - requestNow
					let resultStringify
					try {
						resultStringify = JSON.stringify(dataResult)
					} catch (striErr) {
						resultStringify = "Error"
					}
					const writeResult = `RequestId:  ${requestId},  useTimer: ${useTimer}ms,  ResultDate:  ${responseNowFomat}\nresponse:  ${resultStringify}`
					if (isDev) {
						console.log(`执行完结束时间 = ${Moment().format("YYYY-MM-DD HH:mm:ss.SSS")} : ${useTimer}ms`)
					}
					try {
						Logger.write("default", writeResult)
						Logger.write("access", writeResult)
					} catch (wriErr) {}
				})
			)
	}
}
