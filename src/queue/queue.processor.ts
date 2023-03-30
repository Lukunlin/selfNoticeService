import { HttpService } from "@nestjs/common"
import { Process, Processor } from "@nestjs/bull"
import { Job } from "bull"
import * as Moment from "moment"
import allowRetry from "../utils/allowRetry"

@Processor("noticeMsg")
export class NoticeMsgProcessor {
	httpService = new HttpService()
	memberMailList = {
		Colin: "f-1388018372420088742",
		杨志勇: "8520122812276689631",
		黄星华: "f-4017398065683870476",
		霍松锋: "f-6426389281104510066",
		朱秋影: "005689",
		张威: "607396662"
	}

	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_SELF}`
	protected readonly targetCzbUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_DEPARTMENT}`
	protected readonly targetCzbFeishu: string = `https://open.feishu.cn/open-apis/bot/v2/hook/${process.env.FEISHU_NOTICE_DEPARTMENT}`

	@Process("noticeMessage")
	handleTranscode(job: Job) {
		const { id, data } = job
		const options = <any>(job.opts || {})
		const pageNum = options.pageNum
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
			const noticeMemberIds: string[] = []
			try {
				JobOptions.noticeMember.forEach((every: string) => {
					const itValue = this.memberMailList[every]
					itValue && noticeMemberIds.push(itValue)
				})
				SendData.mentioned_list = noticeMemberIds
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
		allowRetry(
			() => {
				return this.httpService
					.post(this.targetCzbFeishu, {
						msg_type: "text",
						content: {
							text: `${SendData.content}\r\n\r\n请以下人员保持关注:    ${JobOptions.noticeMember.join(", ")}`
						}
					})
					.toPromise()
			},
			5,
			1000
		)
	}

	@Process("markdownForCzb")
	handlePushNoticeMarkdownToCzb(job: Job) {
		const { id, data } = job
		const options = <any>(job.opts || {})

		allowRetry(
			() => {
				return this.httpService
					.post(this.targetCzbUrl, {
						msgtype: "markdown",
						markdown: {
							content: data
						}
					})
					.toPromise()
			},
			5,
			1000
		)
		if (options.feishuData && options.feishuData.content) {
			allowRetry(
				() => {
					return this.httpService
						.post(this.targetCzbFeishu, {
							msg_type: "interactive",
							card: {
								config: {
									update_multi: true,
									wide_screen_mode: true
								},
								header: {
									title: {
										tag: "plain_text",
										content: options.feishuData.title || "能链Saas版本全量放流通知服务"
									}
								},
								elements: [
									{
										tag: "markdown",
										text_align: "left",
										content: options.feishuData.content
									}
								]
							}
						})
						.toPromise()
				},
				5,
				1000
			)
		}
	}
}
