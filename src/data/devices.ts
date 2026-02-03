// 设备数据配置文件

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = {
	[categoryName: string]: Device[];
} & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = {
	Xiaomi: [
		{
			name: "Redmi k30 5G",
			image: "/images/device/redmi k30 5G.png",
			specs: "Purple / 6G + 128GB",
			description:
				"120Hz smooth display, 64MP AI camera, 30W fast charging.",
			link: "https://wap.zol.com.cn/1291/1290070/index.html",
		},
	],
	HONOR: [
		{
			name: "Honor 8A",
			image: "/images/device/Honor 8A.png",
			specs: "Black / 3G + 64GB",
			description:
				"MediaTek chipset, 13MP AI camera, 5W standard charging.",
			link: "https://wap.zol.com.cn/1250/1249446/index.html",
		},
	],
	"TP-LINK": [
		{
			name: "TL-WDR7660千兆版",
			image: "/images/device/TL-WDR7660千兆版.png",
			specs: "1900Mbps / 1G",
			description:
				"AC1900 wireless router suitable for home and business use.",
			link: "https://www.tp-link.com.cn/m/product_1254.html?t=index",
		},
	],
};
