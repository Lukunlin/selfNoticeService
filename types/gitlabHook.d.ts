export interface IGitlabWebHooks {
	object_kind: string
	event_name: string
	before: string
	after: string
	ref: string
	checkout_sha: string
	message: string | null
	user_id: number
	user_name: string
	user_username: string
	user_email: string
	user_avatar: string
	project_id: number
	project: {
		id: number
		name: string
		description: string | null
		web_url: string
		avatar_url: string | null
		git_ssh_url: string
		git_http_url: string
		namespace: string
		visibility_level: number
		path_with_namespace: string
		default_branch: string
		ci_config_path: string | null
		homepage: string
		url: string
		ssh_url: string
		http_url: string
	}
	commits: Array<{
		id: string
		message: string
		title: string
		timestamp: string
		url: string
		author: {
			name: string
			email: string
		}
		added: string[]
		modified: string[]
		removed: string[]
	}>
	total_commits_count: number
	push_options: any
	repository: {
		name: string
		url: string
		description: string | null
		homepage: string
		git_http_url: string
		git_ssh_url: string
		visibility_level: number
	}
}

export interface IProdNoticeBody {
	/*
	 * 推送的全部消息内容
	 * case: 唐恩萌 PRD-front-mp-deploy环境green已部署完成请留意
	 * */
	job: string
	/*
	 * 发布的单号
	 * case: operation202201131841
	 * */
	deploy_num: string
	/*
	 * 发布的分支
	 * case: origin/release_4.0.0
	 * */
	git_branch: string
	/*
	 * 发布的分支的最后commitId
	 * case: fbda7c41ef6e03fea4bcfd08a8d5bee7f4c0415a
	 * */
	commitID: string
}
