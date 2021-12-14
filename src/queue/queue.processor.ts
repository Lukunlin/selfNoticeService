import { HttpService } from "@nestjs/common"
import { Process, Processor } from "@nestjs/bull"
import { Job } from "bull"
import * as Moment from "moment"

@Processor("noticeMsg")
export class NoticeMsgProcessor {
	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHAT_NOTICE_WEBSOKET}`

	@Process("noticeMessage")
	handleTranscode(job: Job) {
		const { id, data } = job
		const pageNum = (<any>(job.opts || {})).pageNum
		const beforeMsgHeader = `ID: ${id}${typeof pageNum === "number" ? ` (${pageNum})页` : ""} ------> ${Moment().format("YYYY/MM/DD HH:mm:ss")}\n`
		const sendMsg = `${beforeMsgHeader}${data}`
		const httpService = new HttpService()
		httpService
			.post(this.targetUrl, {
				msgtype: "text",
				text: {
					content: sendMsg,
					mentioned_mobile_list: [process.env.MOBILE_NUMBER]
				}
			})
			.toPromise()
	}
}
