import { Controller, Get, Post, Body, HttpCode, Query, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiParam, ApiBody } from "@nestjs/swagger"
import { SelfNoticeService } from "./selfNotice.service"
import { Type } from "class-transformer"
import { IsNumber, IsString, Length, IsOptional } from "class-validator"
import * as Moment from "moment"

class DtoWhisperNotice {
	@IsString()
	@Length(1, 80, { message: "留言内容长度需要在1-50个字符以内" })
	content: string

	@Type(() => Number)
	@IsNumber()
	channel: number

	@IsOptional()
	@Length(11, 11, { message: "请填写合法的手机号" })
	phone?: string | number

	@IsOptional()
	@IsString()
	@Length(3, 20, { message: "微信号需要在3-20个字符以内" })
	wechat?: string
}
class DtoGetMySsr {
	passwd: string
}

@Controller("/selfNotice")
export class SelfNoticeController {
	constructor(private readonly appService: SelfNoticeService) {}

	@Post("/whisper")
	@ApiTags("自己相关内容的通知服务")
	@ApiOperation({ summary: "自己相关内容的通知服务", description: "在个人生活中的一些对自己的留言啊等相关通知" })
	@ApiParam({ name: "channel" })
	@ApiParam({ name: "content" })
	@ApiParam({ name: "phone" })
	@ApiParam({ name: "wechat" })
	@ApiBody({ type: DtoWhisperNotice, description: "请输入必要字段" })
	@HttpCode(200)
	async whisperNotice(@Body() body: DtoWhisperNotice) {
		return await this.appService.whisperNotice(body)
	}

	@Get("/getSsr")
	@ApiTags("通过订阅获取我的SSR链接")
	@ApiOperation({ summary: "自己的工具箱", description: "通过接口可随时获取自己的SSR链接" })
	@ApiParam({ name: "passwd" })
	@ApiBody({ type: DtoGetMySsr, description: "该接口已废弃,请访问最新的订阅链接" })
	@HttpCode(200)
	async getMySsr(@Query("passwd") passwd) {
		if (passwd && passwd.length === 8) {
			const Password = passwd.slice(0, 6)
			const SubPasswd = passwd.slice(6, 8).split("").reverse().join("")
			const Hour = Moment().hour()
			const HourStr = Hour > 9 ? String(Hour) : `0${Hour}`
			const currentHour = HourStr.split("").reverse().join("")
			if (Password === process.env.SELF_SSR_PASSWD && SubPasswd === currentHour) {
				return await this.appService.getSsrUrl()
			}
		}
		throw new HttpException("该接口已废弃,请访问最新的订阅链接", HttpStatus.EXPECTATION_FAILED)
	}
}
