import { HttpService } from "@nestjs/common"
import { Process, Processor } from "@nestjs/bull"
import { Job } from "bull"
import * as Moment from "moment"
import allowRetry from "../utils/allowRetry"

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

		allowRetry(
			() => {
				return this.httpService
					.post(this.targetUrl, {
						msgtype: "text",
						text: {
							content: sendMsg,
							mentioned_mobile_list: [process.env.MOBILE_NUMBER]
						}
					})
					.toPromise()
			},
			5,
			1000
		)
	}

	@Process("noticeForCzb")
	async handleTranscodeToCzb(job: Job) {
		const JobOptions = job.opts as { noticeAll: boolean; noticeMember?: string[] }
		const { noticeAll: isNoticeAll = false } = JobOptions
		const noticeList = [process.env.MOBILE_NUMBER]
		if (isNoticeAll) {
			noticeList.push("@all")
		}
		const SendData: { content: string; mentioned_list?: string[]; mentioned_mobile_list: string[] } = {
			content: job.data || "推送消息发生错误",
			mentioned_mobile_list: noticeList
		}
		if (JobOptions.noticeMember && JobOptions.noticeMember.length && process.env.SAAS_MEMBER_QUERY_SERVICE) {
			let noticeMemberIds: string[] = []
			try {
				const targetQueryUrl = decodeURIComponent(process.env.SAAS_MEMBER_QUERY_SERVICE)
				const queryMemberResult = await this.httpService.get(targetQueryUrl, { params: { names: JobOptions.noticeMember.join(",") } }).toPromise()
				if (queryMemberResult.data) {
					noticeMemberIds = queryMemberResult.data.split("|").filter((e) => e && e !== "@all" && e !== "f-1388018372420088742")
					SendData.mentioned_list = noticeMemberIds
				}
			} catch (err) {
				// 错误了就不查询了
			}
		}
		allowRetry(
			() => {
				return this.httpService
					.post(this.targetCzbUrl, {
						msgtype: "text",
						text: SendData
					})
					.toPromise()
			},
			5,
			1000
		)
	}
}
