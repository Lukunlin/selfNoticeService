import { Injectable } from "@nestjs/common"

@Injectable()
export class AppService {
	hello(): string {
		return "Hi, my friend"
	}
}
