import { HttpService } from "@nestjs/common"
import { Process, Processor } from "@nestjs/bull"
import { Job } from "bull"
import * as Moment from "moment"

@Processor("noticeMsg")
export class NoticeMsgProcessor {
	httpService = new HttpService()

	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_SELF}`
	protected readonly targetCzbUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_DEPARTMENT}`

	@Process("noticeMessage")
	handleTranscode(job: Job) {
		const { id, data } = job
		const pageNum = (<any>(job.opts || {})).pageNum
		const beforeMsgHeader = `ID: ${id}${typeof pageNum === "number" ? ` (${pageNum})页` : ""} ------> ${Moment().format("YYYY/MM/DD HH:mm:ss")}\n`
		const sendMsg = `${beforeMsgHeader}${data}`

		this.httpService
			.post(this.targetUrl, {
				msgtype: "text",
				text: {
					content: sendMsg,
					mentioned_mobile_list: [process.env.MOBILE_NUMBER]
				}
			})
			.toPromise()
	}

	@Process("noticeForCzb")
	handleTranscodeToCzb(job: Job) {
		const { noticeAll: isNoticeAll = false } = job.opts as any
		const noticeList = [process.env.MOBILE_NUMBER]
		if (isNoticeAll) {
			noticeList.push("@all")
			noticeList.push("@所有人")
		}
		this.httpService
			.post(this.targetCzbUrl, {
				msgtype: "text",
				text: {
					content: job.data || "推送消息发生错误",
					mentioned_mobile_list: noticeList
				}
			})
			.toPromise()
	}
}
