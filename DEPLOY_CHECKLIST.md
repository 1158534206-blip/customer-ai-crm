# 上线检查清单

## 本地先测试
1. 安装 Node.js 20+
2. 在项目目录运行：
   npm install
3. 可先不配置数据库：
   npm start
4. 打开 http://localhost:3000

## Railway 正式上线
建议配置：
- APP_PASSWORD：软件访问密码
- DEEPSEEK_API_KEY：AI接口密钥
- DEEPSEEK_MODEL：你API账号可用的模型
- DATABASE_URL：由 Railway PostgreSQL 自动提供

## 上线后验收
- 能登录
- 能新建客户
- 行业可自由填写
- 刷新后客户仍存在
- 深度访谈能保存
- 运营规划能长期修改
- 内容库7个状态正常
- 三次教案可一键创建
- 培训实际记录能保存
- 作业能记录提交/反馈/问题
- 视频12项数据能保存
- 时间线正常
- AI能读取当前客户资料
- AI结果可以保存到对应模块
- JSON备份可下载、可恢复
