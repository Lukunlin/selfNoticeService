import { Injectable } from "@nestjs/common"
import { RedisModule, RedisService } from "nestjs-redis"

@Injectable()
export class CacheService {
	public client
	constructor(private redisService: RedisService) {
		this.getClient()
	}
	protected async getClient() {
		this.client = await this.redisService.getClient()
	}

	public async check(token: string): Promise<boolean> {
		const result = Boolean(this.get(token))
		return result
	}

	public async get(key: string) {
		if (!this.client) {
			await this.getClient()
		}
		let data = await this.client.get(key)
		if (!data) return null
		try {
			data = JSON.parse(data)
		} catch (err) {
			data = null
		}
		return data
	}

	public async set(key: string, value: any, seconds?: number) {
		value = JSON.stringify(value)
		if (!this.client) {
			await this.getClient()
		}
		if (!seconds) {
			await this.client.set(key, value)
		} else {
			await this.client.set(key, value, "EX", seconds)
		}
	}

	public async del(keys: string | string[]) {
		if (!this.client) {
			await this.getClient()
		}
		if (Array.isArray(keys)) {
			this.client.del(...keys)
		} else {
			this.client.del(keys)
		}
	}
}
