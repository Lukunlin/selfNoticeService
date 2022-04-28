import { Injectable, HttpService } from "@nestjs/common"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"

@Injectable()
export class SelfNoticeService {
	constructor(private readonly httpService: HttpService, private readonly noticeService: NoticeWecomService) {}
	protected readonly channelMatch = 1

	public whisperNotice(body) {
		if (body.content) {
			if (body.channel == this.channelMatch) {
				// 车内二维码留言通知
				let sendMsg = "\n收到来自停车留言通知:\n\n"
				if (typeof body.phone !== "undefined") {
					sendMsg += `留言者手机号: ${body.phone}\n`
				}
				if (typeof body.wechat !== "undefined") {
					sendMsg += `留言者微信号: ${body.wechat}\n`
				}
				sendMsg += `留言内容: ${body.content}`
				this.noticeService.submitMsgForMe(sendMsg)
				return true
			}
		}
		return false
	}
}
