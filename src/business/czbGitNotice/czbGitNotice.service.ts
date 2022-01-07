import { Injectable, HttpService } from "@nestjs/common"
import { IGitlabWebHooks } from "../../../types/gitlabHook"
import * as Moment from "moment"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"

@Injectable()
export class CzbGitNoticeService {
	constructor(private readonly httpService: HttpService, private readonly noticeService: NoticeWecomService) {}

	protected readonly bannerImgArray: string[] = [
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/ad6df1610475a931f0c128cc754a.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/4834ee161fe8a6ba00296ac0a007.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/7301481de7f3d1535afb81f2e0ae.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/b8cb2bf92836bc871d6a95e270ff.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/170329e6d7aa9ac92cb9487ea123.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/b77368ce5a9418898ddce8a15aff.jpeg"
	]
	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_DEPARTMENT}`

	protected getRandomNumber(minNum: number, maxNum: number) {
		switch (arguments.length) {
			case 1:
				return parseInt(String(Math.random() * minNum + 1), 10)
				break
			case 2:
				return parseInt(String(Math.random() * (maxNum - minNum + 1) + minNum), 10)
				break
			default:
				return 0
				break
		}
	}
	public getRandomImage() {
		const randomNumber = this.getRandomNumber(0, this.bannerImgArray.length - 1)
		return this.bannerImgArray[randomNumber]
	}
	public async pushNewsToWecom(body: IGitlabWebHooks) {
		const ProjectName = body.project.name || "unknow"
		const LastAuthor = body.user_name || "unknow"
		const Warehouse = body.project.web_url || "https://gitlab.nlsaas.com"
		const Method = body.event_name
		const CommitCount = body.total_commits_count || 0
		const CommitList = body.commits || []
		const CommitItem = CommitList[CommitList.length - 1] || CommitList[0]
		const CurrentDate = Moment()
		const CurrentDateFormat = CurrentDate.format("MM月DD日 HH:mm:ss")
		const CurrentHour = CurrentDate.hours()
		const updatedBranchSplit = (body.ref || "").split("/")
		const updatedBranch = updatedBranchSplit[updatedBranchSplit.length - 1] || "unknow"
		let projectChineseName = "项目"
		let SubContent = "\n主线分支更新啦~"

		if (Method !== "push") {
			return false
		}
		if (ProjectName === "mp") {
			const MainBranchArrs = (process.env.SAAS_MP_MAIN_BRANCH || "master").split(",")
			if (!MainBranchArrs.includes(updatedBranch)) {
				// 不在白名单的分支不推送
				return false
			}
			projectChineseName = "Saas商户平台"
			if (updatedBranch !== "master") {
				SubContent = "\n收到关键分支更新提醒"
			}
		} else if (ProjectName === "taro_micro") {
			projectChineseName = "Saas加油小程序"
		} else if (ProjectName === "webAppService") {
			projectChineseName = "Saas公众号"
		} else if (ProjectName === "mp_micro") {
			projectChineseName = "Saas商家助手小程序"
		} else if (ProjectName === "mini_micro") {
			projectChineseName = "Saas流量版小程序"
		}
		const pushTitle = `${projectChineseName}  [${ProjectName}]${SubContent}`
		let pushDescription = `\n本次更新分支为: 【 ${updatedBranch} 】`
		pushDescription += `\n--------------------------------------`
		pushDescription += `\n操作人: ${LastAuthor}`
		pushDescription += `\n推送时间为: ${CurrentDateFormat}`
		pushDescription += `\n本次更新的commit数量为: ${CommitCount}个`
		if (CommitItem && Object.keys(CommitItem).length) {
			if (CommitItem.author) {
				pushDescription += `\n最后Commit更新提交人: ${CommitItem.author.name || "unknow"}`
			}
			if (CommitItem.timestamp) {
				pushDescription += `\n最后Commit更新时间: ${Moment(CommitItem.timestamp).format("YYYY年MM月DD日 HH:mm:ss")}`
			}
			if (CommitItem.message || CommitItem.title) {
				pushDescription += `\n以下为本次最后更新的commit内容:\n--------------------------------------\n${CommitItem.message || CommitItem.title}`
			}
		}

		try {
			await this.httpService
				.post(this.targetUrl, {
					msgtype: "news",
					news: {
						articles: [
							{
								url: CommitItem.url || `${Warehouse}/-/commit/${CommitItem.id}`,
								picurl: this.getRandomImage(),
								title: pushTitle,
								description: pushDescription
							}
						]
					}
				})
				.toPromise()
			this.noticeService.submitMsgForCzb(`【${projectChineseName}】已经收到更新~\n请大家检查各自的开发分支和有依赖的相关分支进行及时的更新。`)
			return true
		} catch (err) {
			return false
		}
	}
}
