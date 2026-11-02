'use strict';

const I18N = {
  zh: {
    'doc.title': 'Miner Gateway · 矿池中转监控',
    'sync.connecting': '正在连接…', 'sync.live': '● 实时同步', 'sync.retry': '○ 正在重连',
    'theme.toggle': '切换深色 / 浅色', 'lang.toggle': '切换为英文',
    'btn.refresh': '刷新', 'btn.addListener': '添加入口', 'btn.configure': '配置矿池 / 钱包', 'btn.cancel': '取消',
    'btn.saveListener': '保存入口', 'btn.saveSettings': '保存共享配置', 'btn.edit': '编辑', 'btn.enable': '启用', 'btn.disable': '停用',
    'btn.detail': '详情', 'btn.downloadCa': '下载信任证书', 'btn.certSettings': '证书设置',
    'overview.tag': '运行监控', 'overview.title': '矿池中转控制台',
    'overview.desc': '自动识别 PRL / QTC，按钱包规则选择矿池并监控份额。',
    'card.active': '在线连接', 'card.listenersRunning': '{n} 个入口运行', 'card.speed': '总网速',
    'card.rewrite': '钱包替换 / 矿池重定向', 'card.rewriteNote': '当前入口 · 本次运行累计', 'card.shares': '份额反馈',
    'card.sharesDetail': '已提交 {s} · 接受 {a} · 拒绝 {r}', 'card.miners': '矿机', 'card.minersDetail': '非 devfee {a} · devfee {b}', 'tip.shareRing': '距上次提交 {elapsed} · 平均间隔 {avg}',
    'uptime.minutes': '服务已运行 {n} 分钟', 'uptime.hours': '服务已运行 {h} 小时 {m} 分钟',
    'traffic.title': '流量趋势', 'traffic.window': '最近 60 秒', 'traffic.up': '↑ 上行', 'traffic.down': '↓ 下行', 'traffic.total': '累计 {v}',
    'listeners.title': 'SOCKS5 监听入口', 'listeners.count': '{n} 个', 'listeners.badge': '每个入口均支持 PRL + QTC',
    'listeners.emptyTitle': '创建第一个 SOCKS5 入口',
    'listeners.emptyDesc': '先设置 PRL / QTC 的矿池与钱包，再添加监听端口。miner 连接任意入口，系统会根据登录报文识别币种。',
    'listener.running': '运行中', 'listener.startFailed': '启动失败', 'listener.stopped': '已停用',
    'listener.typeStratum': '矿池端口', 'listener.stratumMode': '矿池端口 · TLS / TCP 自动 · PRL + QTC · 强制替换钱包',
    'listener.upstream': '上游 SOCKS5 · {target}', 'listener.direct': '直接连接矿池',
    'listener.authRequired': '入口需要认证', 'listener.authNone': '入口免认证',
    'listener.activeTotal': '在线 / 累计连接', 'listener.speed': '网速 ↑ / ↓',
    'listener.deleteConfirm': '删除入口“{name}”？该入口的连接将断开。',
    'miners.title': '矿机份额', 'miners.note': '按币种、客户端、矿机名和钱包汇总 · 本次运行',
    'miners.hideOffline': '隐藏离线矿机', 'miners.hiddenAll': '{n} 台离线矿机已隐藏',
    'miners.total': '总算力', 'miners.totalNote': '该币种全部矿机（含离线但仍在窗口内的记录）在 1h / 6h 窗口内的算力估算合计',
    'miners.foot1': '估算算力按提交份额所属 Job 的难度累计，包含拒绝份额；不足 1h / 6h 时按已观测时长计算。份额少时会波动，旧记录不补造难度数据。',
    'miners.foot2': '离线矿机保留本次运行统计。Job 与提交时间自功能启用后记录；未采集的历史时间显示为未知。devfee 的份额列显示“挽回的损失”标签，数量沿用该行原有份额统计。',
    'miners.empty': '登录后显示矿机名、Job 和份额；例如 wallet.6600 中的 6600',
    'miner.unnamed': '未提供矿机名', 'miner.online': '在线 · {n} 连接', 'miner.offline': '离线',
    'th.worker': '矿机名', 'th.coinStatus': '币种 / 状态', 'th.wallet': '钱包地址', 'th.difficulty': '当前难度',
    'th.hashrate': '估算算力 1h / 6h', 'th.submitted': '提交', 'th.accepted': '接受', 'th.rejected': '拒绝',
    'th.lastSubmit': '距上次提交', 'th.lastSeen': '最后活动',
    'th.clientListener': '客户端 / 入口', 'th.route': '原目标 → 实际矿池', 'th.walletAction': '钱包处理',
    'th.speed': '实时网速 ↑ / ↓', 'th.shares': '份额 接受 / 拒绝',
    'connections.title': '实时连接', 'connections.count': '{n} 条', 'filter.all': '所有币种',
    'search.placeholder': '搜索目标、钱包或客户端',
    'connections.foot': '网速按应用数据量计算。份额数来自矿池响应，不代表算力；点击详情查看完整目标与钱包。',
    'connections.noMatch': '没有匹配的连接', 'connections.waiting': '等待 miner 接入',
    'connections.noMatchHint': '调整币种或搜索条件', 'connections.waitingHint': '连接后可查看原目标、实际矿池与钱包替换结果',
    'tls.title': 'TLS 证书', 'tls.desc': 'TLS 登录需要 miner 信任本机证书。默认按原目标域名签发证书，也可配置自己的 CA 或服务端证书。',
    'tls.modeGenerated': '自动生成的本地 CA · 按目标签发', 'tls.modeBundled': '随项目提供的默认 CA · 按目标签发',
    'tls.modeCustomCa': '自定义 CA · 按目标签发', 'tls.modeCustomServer': '自定义服务端证书',
    'tls.expiry': '有效期至 {date}',
    'footer.brand': 'MINER GATEWAY · PRL / QTC 实时监控', 'footer.waiting': '等待状态更新', 'footer.updated': '更新于 {time}',
    'footer.memory': '内存 {rss}（堆 {heap}）',
    'dialog.addListener': '添加入口', 'dialog.editListener': '编辑入口', 'dialog.listenerSub': '所有入口自动识别 PRL 和 QTC',
    'form.name': '入口名称', 'form.namePlaceholder': '例如：矿机组 A', 'form.listenHost': '本地监听地址', 'form.listenPort': '本地端口',
    'form.protocol': '端口类型',
    'form.protocolSocks': 'SOCKS5 代理入口（矿机用 --proxy 连接）',
    'form.protocolStratum': '矿池端口（miner 直接作为矿池连接）',
    'form.stratumHint': '矿池端口：miner 直接把本端口填成矿池地址。同一端口同时接受明文 TCP 与 TLS，PRL 和 QTC 按登录报文自动识别；该端口无视 miner 的原始钱包，统一替换为配置的钱包，仅保留矿机名，无 SOCKS5 认证。',
    'form.localhost': '本机访问', 'form.anyv4': '所有 IPv4 网卡', 'form.localhost6': 'IPv6 本机访问',
    'form.listenHint': '这是矿机连接本程序的入口。填写本机 IP，或用 0.0.0.0 接收局域网连接；端口需空闲。局域网矿机连接时填写运行本程序的电脑 IP。',
    'form.clientTransport': 'miner 到入口的传输', 'form.auto': '自动识别明文 TCP / TLS', 'form.tcp': '明文 TCP', 'form.tls': 'TLS',
    'form.mode': '入口到矿池的连接方式', 'form.direct': '直接连接矿池', 'form.socks5': '通过上游 SOCKS5',
    'form.upstreamHint': '本程序通过下面的代理服务器访问矿池，可填写远程服务器地址。',
    'form.socksHost': '上游 SOCKS5 地址', 'form.socksHostPlaceholder': '代理服务器 IP 或域名', 'form.socksPort': '上游端口',
    'form.usernameOptional': '用户名（可选）', 'form.passwordOptional': '密码（可选）',
    'form.authSection': '入口认证（可选）', 'form.username': '用户名', 'form.password': '密码', 'form.authHint': '同时留空则无需认证。仅 SOCKS5 代理入口使用。',
    'form.enabled': '启用入口', 'form.enabledHint': '修改已运行入口会断开其当前连接，由 miner 重连。',
    'settings.title': '共享矿池与钱包', 'settings.sub': '以下配置由所有 SOCKS5 入口复用',
    'settings.routingMode': '钱包替换模式', 'settings.mode1': '模式 1 · 仅处理已知 dev 钱包', 'settings.mode2': '模式 2 · 统一矿池与钱包白名单',
    'settings.mode1Note': '已知 dev 钱包且不在白名单：替换为该币种白名单第一项，并转到预设矿池。其他钱包保持原钱包和原矿池，适合多个不同钱包挖矿。',
    'settings.mode2Note': '所有连接使用预设矿池。白名单内保留原钱包；白名单外替换为该币种白名单第一项。适合统一矿池并允许多个钱包挖矿。',
    'settings.knownSummary': '已知 dev 钱包名单', 'settings.knownPlaceholder': '每行一个钱包',
    'settings.knownHint': '模式 1 据此选择重定向；两种模式均据此标记 dev 份额，并统一矿机名为 devfee。内置名单自动保留，可补充其他 dev 钱包。匹配忽略 .矿机名 和 + 协议后缀；白名单钱包地址保留。',
    'settings.nockTitle': 'NOCK 双挖白名单', 'settings.nockBadge': 'PRL 端口 3360 / 3361 / 3362',
    'settings.nockLabel': 'NOCK 白名单 · 第一项用于替换', 'settings.nockPlaceholder': '每行一个 NOCK 钱包，第一项作为替换目标',
    'settings.nockHint': 'PRL 矿池端口为 3360 / 3361 / 3362 且登录带 +NOCK 双挖后缀时生效：白名单内保留原 NOCK 地址，否则替换为第一项；发往矿池的钱包统一为 PRL钱包+NOCK钱包.矿机名。其他端口的矿池只接受 钱包.矿机名，会自动去掉 +NOCK。留空表示不替换 NOCK 地址。',
    'settings.tlsSummary': '本地 TLS 证书', 'settings.certSource': '证书来源',
    'settings.certGenerated': '自动生成 CA，并按原目标签发证书', 'settings.certCustom': '自定义 CA 或服务端证书',
    'settings.certHint': '自定义 CA 会按原目标域名签发证书；自定义服务端证书会直接使用，需要覆盖 miner 请求的域名。可从首页下载当前使用的信任证书。',
    'settings.certFile': '证书 / CA（PEM）', 'settings.keyFile': '配套私钥（PEM）', 'settings.passphrase': '私钥密码（如有）',
    'settings.savedCert': '已保存证书和私钥，留空则沿用；更换时请同时上传。', 'settings.needCert': '请同时上传证书和私钥。',
    'settings.warning': '保存不会断开 miner：已登录的连接会自动用新钱包重新登录矿池并继续下发 Job，旧连接保留 5 分钟用于转发旧 Job 提交；无法热切换的连接保持原连接。',
    'coin.enable': '启用此币种', 'coin.poolHost': '矿池地址', 'coin.port': '端口', 'coin.poolTitle': '{coin} 矿池',
    'common.enabled': '已启用', 'common.disabled': '未启用',
    'coin.wallets': '钱包白名单 · 第一项用于替换', 'coin.walletsPlaceholder': '每行一个 {coin} 钱包，第一项作为替换目标',
    'coin.walletsHint': '每行一个钱包，也可用逗号分隔，最多 100 项。名单内保留原钱包；需要替换时使用第一项，并保留 .6600 等矿机名。{extra} 已知 dev 钱包的矿机名固定为 devfee；其他钱包优先使用配置中的 .矿机名。',
    'coin.walletsExtraPrl': 'PRL 登录的 + 协议后缀也会保留。', 'coin.walletsExtraQtc': '保留 pass、agent 等其他字段。',
    'coin.poolPassword': '矿池密码（留空沿用 miner）', 'coin.transport': '连接矿池的传输',
    'coin.tlsDetails': '矿池 TLS 验证', 'coin.verifyTls': '验证矿池证书', 'coin.servername': 'TLS 服务器名称（可选）',
    'coin.servernamePlaceholder': '默认使用矿池地址', 'coin.caFile': '私有 CA（可选，PEM）', 'coin.clearCa': '清除已保存的矿池 CA',
    'coin.caSaved': '已保存私有 CA；不上传则沿用。', 'coin.caDefault': '默认使用系统信任的 CA。',
    'coin.connections': '{n} 条连接 · 所有入口共享', 'coin.waitingPool': '等待配置矿池',
    'coin.whitelist': '白名单 {n} 项 · 第一项用于替换 · {mode}', 'coin.nockNote': ' · NOCK 双挖白名单 {n} 项',
    'coin.editSettings': '修改共享配置', 'coin.setSettings': '设置矿池与钱包',
    'mode.1': '模式 1', 'mode.2': '模式 2',
    'status.socks': 'SOCKS5 握手', 'status.detecting': '识别传输', 'status.tls': 'TLS 握手', 'status.awaitingLogin': '等待登录',
    'status.connecting': '连接矿池', 'status.switching': '切换矿池', 'status.connected': '矿池已连接', 'status.loginSent': '登录已发送',
    'status.working': '已登录', 'status.loginRejected': '登录被拒绝', 'status.closed': '已结束', 'status.coin': '识别中',
    'transport.detecting': '识别中', 'transport.pending': '待识别', 'pool.waiting': '等待登录识别',
    'difficulty.waiting': '等待难度', 'rate.noData': '等待数据', 'rate.waitingShares': '等待新份额统计',
    'rate.note': '已观测 {m} 分钟 · 有难度的提交 {k} 份 · 难度未知 {u} 份{o}', 'rate.openWindow': ' · 窗口未满',
    'rate.partial': '按已观测时长计算', 'rate.missing': '缺 {n} 份难度', 'recovery.label': '挽回的损失',
    'wallet.waiting': '等待登录', 'wallet.notRecorded': '未记录', 'wallet.originalTitle': '原钱包：{v}',
    'wallet.replaced': '已替换钱包', 'wallet.whitelisted': '白名单 · 已保留', 'wallet.passthrough': '原钱包保留', 'wallet.same': '钱包一致',
    'wallet.nockTitle': 'NOCK 双挖钱包：{a} → {b}', 'wallet.nockKept': 'NOCK ✓ {v} · 已保留',
    'diff.sourceTarget': '工作量按矿池 target 换算', 'diff.sourcePool': '矿池下发的份额难度',
    'age.never': '尚未提交', 'age.unknown': '历史时间未知',
    'age.seconds': '{n} 秒前', 'age.minutes': '{m} 分 {s} 秒前', 'age.hours': '{h} 小时 {m} 分前', 'age.days': '{d} 天 {h} 小时前',
    'notice.listenerSaved': '入口已保存，所有入口均支持 PRL / QTC', 'notice.listenerSaveFailed': '入口已保存，但启动失败：{msg}',
    'notice.settingsSaved': '共享配置已保存，已登录连接已热切换', 'notice.settingsKept': '配置已保存，但 {n} 条连接未能切换：{reason}（后台会自动重试）', 'error.statusRead': '实时状态读取失败：{msg}',
    'err.addrNotAvailable': '监听地址 {host} 不属于运行本程序的电脑。请填写本机 IP 或 0.0.0.0，代理服务器请填写在“上游 SOCKS5 地址”。',
    'err.addrInUse': '本地监听 {target} 的端口已被其他程序或入口占用，请选择空闲端口。',
    'err.upstreamLoop': '入口“{source}”的上游 {from} 与入口“{dest}”的监听 {to} 重合，当前配置禁止上游指向项目内的入口。请为新入口选择其他空闲端口。',
    'detail.title': '连接详情',
    'detail.id': '连接 ID', 'detail.status': '状态', 'detail.coinListener': '币种 / 入口', 'detail.worker': '矿机名',
    'detail.client': '客户端', 'detail.target': '原目标', 'detail.pool': '实际矿池', 'detail.transport': '传输',
    'detail.original': '原钱包', 'detail.applied': '实际钱包', 'detail.nock': 'NOCK 双挖钱包',
    'detail.difficulty': '当前难度', 'detail.lastShare': '最近提交难度', 'detail.result': '处理结果',
    'detail.speed': '实时网速', 'detail.bytes': '累计流量', 'detail.shares': '份额', 'detail.started': '开始时间',
    'detail.redirected': '矿池已重定向', 'detail.poolKept': '原矿池保留', 'detail.poolSame': '矿池目标一致或待识别',
    'detail.walletReplaced': '钱包已替换', 'detail.walletWhitelisted': '白名单钱包保留', 'detail.walletKept': '原钱包保留',
    'detail.walletSame': '钱包一致或待识别', 'detail.recovered': '挽回的损失', 'detail.shareTag': '份额标注',
    'detail.policy': '处理策略', 'detail.forcedPolicy': '矿池端口 · 无视原钱包，仅保留矿机名',
    'detail.sharesValue': '提交 {s} · 接受 {a} · 拒绝 {r}',
    'detail.nockKept': '{a} → {b}（已保留）', 'detail.nockReplaced': '{a} → {b}（已替换）'
  },
  en: {
    'doc.title': 'Miner Gateway · Pool Relay Monitor',
    'sync.connecting': 'Connecting…', 'sync.live': '● Live', 'sync.retry': '○ Reconnecting',
    'theme.toggle': 'Toggle dark / light mode', 'lang.toggle': 'Switch to Chinese',
    'btn.refresh': 'Refresh', 'btn.addListener': 'Add listener', 'btn.configure': 'Pools / Wallets', 'btn.cancel': 'Cancel',
    'btn.saveListener': 'Save listener', 'btn.saveSettings': 'Save shared settings', 'btn.edit': 'Edit', 'btn.enable': 'Enable', 'btn.disable': 'Disable',
    'btn.detail': 'Details', 'btn.downloadCa': 'Download trust certificate', 'btn.certSettings': 'Certificate settings',
    'overview.tag': 'MONITORING', 'overview.title': 'Pool Relay Console',
    'overview.desc': 'Detects PRL / QTC automatically, selects pools by wallet rules and tracks shares.',
    'card.active': 'Active connections', 'card.listenersRunning': '{n} listeners running', 'card.speed': 'Total speed',
    'card.rewrite': 'Wallet rewrites / redirects', 'card.rewriteNote': 'Current listeners · this run', 'card.shares': 'Share feedback',
    'card.sharesDetail': 'Submitted {s} · Accepted {a} · Rejected {r}', 'card.miners': 'Miners', 'card.minersDetail': '{a} non-devfee · {b} devfee', 'tip.shareRing': '{elapsed} since last share · avg {avg}',
    'uptime.minutes': 'Uptime {n} min', 'uptime.hours': 'Uptime {h} h {m} min',
    'traffic.title': 'Traffic trend', 'traffic.window': 'Last 60 s', 'traffic.up': '↑ Up', 'traffic.down': '↓ Down', 'traffic.total': 'Total {v}',
    'listeners.title': 'SOCKS5 listeners', 'listeners.count': '{n}', 'listeners.badge': 'Every listener accepts PRL + QTC',
    'listeners.emptyTitle': 'Create your first SOCKS5 listener',
    'listeners.emptyDesc': 'Set up the PRL / QTC pools and wallets first, then add a listen port. Miners connect to any listener and the coin is detected from the login message.',
    'listener.running': 'Running', 'listener.startFailed': 'Failed to start', 'listener.stopped': 'Disabled',
    'listener.typeStratum': 'Pool port', 'listener.stratumMode': 'Pool port · TLS / TCP auto · PRL + QTC · forced wallet replace',
    'listener.upstream': 'Upstream SOCKS5 · {target}', 'listener.direct': 'Direct to pool',
    'listener.authRequired': 'Authentication required', 'listener.authNone': 'No authentication',
    'listener.activeTotal': 'Active / total', 'listener.speed': 'Speed ↑ / ↓',
    'listener.deleteConfirm': 'Delete listener “{name}”? Its connections will be closed.',
    'miners.title': 'Miner shares', 'miners.note': 'Grouped by coin, client, worker and wallet · this run',
    'miners.hideOffline': 'Hide offline miners', 'miners.hiddenAll': '{n} offline miner(s) hidden',
    'miners.total': 'total', 'miners.totalNote': 'Sum of the 1h / 6h windowed hashrate estimates across all miners of this coin, including offline miners still inside the window',
    'miners.foot1': 'Estimated hashrate accumulates the difficulty of each submitted job, including rejected shares; windows shorter than 1h / 6h are scaled to the observed time. Estimates fluctuate with few shares and old records are not backfilled.',
    'miners.foot2': 'Offline miners keep this run’s stats. Jobs and submit times are recorded since the feature was enabled; missing history shows as unknown. devfee rows carry the “Recovered” tag and reuse their original share counters.',
    'miners.empty': 'Worker, jobs and shares appear after login; e.g. 6600 in wallet.6600',
    'miner.unnamed': 'Unnamed worker', 'miner.online': 'online · {n} conn', 'miner.offline': 'offline',
    'th.worker': 'Worker', 'th.coinStatus': 'Coin / status', 'th.wallet': 'Wallet', 'th.difficulty': 'Difficulty',
    'th.hashrate': 'Est. hashrate 1h / 6h', 'th.submitted': 'Submitted', 'th.accepted': 'Accepted', 'th.rejected': 'Rejected',
    'th.lastSubmit': 'Since submit', 'th.lastSeen': 'Last seen',
    'th.clientListener': 'Client / listener', 'th.route': 'Target → Pool', 'th.walletAction': 'Wallet handling',
    'th.speed': 'Speed ↑ / ↓', 'th.shares': 'Shares A / R',
    'connections.title': 'Live connections', 'connections.count': '{n}', 'filter.all': 'All coins',
    'search.placeholder': 'Search target, wallet or client',
    'connections.foot': 'Speeds are application payload rates. Share counts come from pool responses and are not hashrate; open details for the full target and wallets.',
    'connections.noMatch': 'No matching connections', 'connections.waiting': 'Waiting for miners',
    'connections.noMatchHint': 'Adjust the coin filter or search', 'connections.waitingHint': 'Target, pool and wallet results appear after miners connect',
    'tls.title': 'TLS certificate', 'tls.desc': 'TLS logins need the miner to trust this machine’s certificate. Certificates are issued for the original target host; a custom CA or server certificate can also be configured.',
    'tls.modeGenerated': 'Generated local CA · per-target leaf', 'tls.modeBundled': 'Bundled default CA · per-target leaf',
    'tls.modeCustomCa': 'Custom CA · per-target leaf', 'tls.modeCustomServer': 'Custom server certificate',
    'tls.expiry': 'Valid until {date}',
    'footer.brand': 'MINER GATEWAY · PRL / QTC live monitoring', 'footer.waiting': 'Waiting for updates', 'footer.updated': 'Updated {time}',
    'footer.memory': 'Memory {rss} (heap {heap})',
    'dialog.addListener': 'Add listener', 'dialog.editListener': 'Edit listener', 'dialog.listenerSub': 'Every listener detects PRL and QTC automatically',
    'form.name': 'Listener name', 'form.namePlaceholder': 'e.g. Rig group A', 'form.listenHost': 'Listen address', 'form.listenPort': 'Listen port',
    'form.protocol': 'Port type',
    'form.protocolSocks': 'SOCKS5 proxy entry (miners use --proxy)',
    'form.protocolStratum': 'Pool port (miners connect directly as a pool)',
    'form.stratumHint': 'Pool port: miners set this port as their pool address. Plain TCP and TLS are both accepted and PRL / QTC is detected from the login message. The original wallet is ignored and replaced with the configured wallet; only the worker name is kept. No SOCKS5 authentication.',
    'form.localhost': 'Loopback only', 'form.anyv4': 'All IPv4 interfaces', 'form.localhost6': 'IPv6 loopback',
    'form.listenHint': 'This is where miners connect. Use a local IP, or 0.0.0.0 to accept LAN connections; the port must be free. LAN miners connect to the IP of this computer.',
    'form.clientTransport': 'Miner → listener transport', 'form.auto': 'Auto-detect plain TCP / TLS', 'form.tcp': 'Plain TCP', 'form.tls': 'TLS',
    'form.mode': 'Listener → pool connection', 'form.direct': 'Direct to pool', 'form.socks5': 'Via upstream SOCKS5',
    'form.upstreamHint': 'This program reaches pools through the proxy below; a remote server address is allowed.',
    'form.socksHost': 'Upstream SOCKS5 host', 'form.socksHostPlaceholder': 'Proxy IP or hostname', 'form.socksPort': 'Upstream port',
    'form.usernameOptional': 'Username (optional)', 'form.passwordOptional': 'Password (optional)',
    'form.authSection': 'Listener authentication (optional)', 'form.username': 'Username', 'form.password': 'Password', 'form.authHint': 'Leave both empty to disable authentication. SOCKS5 proxy entries only.',
    'form.enabled': 'Enable listener', 'form.enabledHint': 'Editing a running listener drops its current connections; miners reconnect automatically.',
    'settings.title': 'Shared pools & wallets', 'settings.sub': 'These settings are shared by all SOCKS5 listeners',
    'settings.routingMode': 'Wallet replacement mode', 'settings.mode1': 'Mode 1 · Known dev wallets only', 'settings.mode2': 'Mode 2 · Unified pool & wallet whitelist',
    'settings.mode1Note': 'Known dev wallets that are not whitelisted: replace with the first whitelist entry and use the preset pool. Other wallets keep their wallet and pool — good for mining with several wallets.',
    'settings.mode2Note': 'All connections use the preset pool. Whitelisted wallets are kept; others are replaced with the first whitelist entry — good for a unified pool with several wallets.',
    'settings.knownSummary': 'Known dev wallet lists', 'settings.knownPlaceholder': 'One wallet per line',
    'settings.knownHint': 'Mode 1 uses these lists for redirects; both modes tag dev shares and rename them to devfee. Built-in entries are always kept and more can be added. Matching ignores the .worker and + suffix; whitelisted wallets keep their address.',
    'settings.nockTitle': 'NOCK dual-mining whitelist', 'settings.nockBadge': 'PRL ports 3360 / 3361 / 3362',
    'settings.nockLabel': 'NOCK whitelist · first entry replaces', 'settings.nockPlaceholder': 'One NOCK wallet per line; the first is the replacement target',
    'settings.nockHint': 'Applies to PRL pools on ports 3360 / 3361 / 3362 when the login carries a +NOCK dual-mining suffix: whitelisted addresses are kept, others are replaced with the first entry, and the pool wallet becomes PRL+NOCK.worker. Pools on other ports accept only wallet.worker, so the +NOCK part is removed automatically. Leave empty to keep NOCK addresses unchanged.',
    'settings.tlsSummary': 'Local TLS certificate', 'settings.certSource': 'Certificate source',
    'settings.certGenerated': 'Generate a CA and issue per-target certificates', 'settings.certCustom': 'Custom CA or server certificate',
    'settings.certHint': 'A custom CA issues certificates for the original host; a custom server certificate is used as-is and must cover the hostnames miners request. Download the current trust certificate from the home page.',
    'settings.certFile': 'Certificate / CA (PEM)', 'settings.keyFile': 'Private key (PEM)', 'settings.passphrase': 'Key passphrase (if any)',
    'settings.savedCert': 'A certificate and key are saved; leave empty to keep them. Upload both when replacing.', 'settings.needCert': 'Upload both the certificate and the private key.',
    'settings.warning': 'Saving does not drop miners: active connections re-login to the pool with the new wallet and keep receiving jobs; the old connection stays 5 minutes to finish old-job submits, and connections that cannot hot-switch keep their current route.',
    'coin.enable': 'Enable this coin', 'coin.poolHost': 'Pool host', 'coin.port': 'Port', 'coin.poolTitle': '{coin} pool',
    'common.enabled': 'enabled', 'common.disabled': 'disabled',
    'coin.wallets': 'Wallet whitelist · first entry replaces', 'coin.walletsPlaceholder': 'One {coin} wallet per line; the first is the replacement target',
    'coin.walletsHint': 'One wallet per line or comma separated, up to 100. Listed wallets keep their address; the first entry replaces others while keeping .6600 style worker names. {extra} Known dev wallets always become devfee; other wallets prefer the .worker from the config.',
    'coin.walletsExtraPrl': 'The PRL + protocol suffix is preserved.', 'coin.walletsExtraQtc': 'pass, agent and other fields are preserved.',
    'coin.poolPassword': 'Pool password (empty = keep miner’s)', 'coin.transport': 'Pool transport',
    'coin.tlsDetails': 'Pool TLS verification', 'coin.verifyTls': 'Verify pool certificate', 'coin.servername': 'TLS server name (optional)',
    'coin.servernamePlaceholder': 'Defaults to the pool host', 'coin.caFile': 'Private CA (optional, PEM)', 'coin.clearCa': 'Clear saved pool CA',
    'coin.caSaved': 'A private CA is saved; leave empty to keep it.', 'coin.caDefault': 'System trust store by default.',
    'coin.connections': '{n} connections · shared by all listeners', 'coin.waitingPool': 'Pool not configured',
    'coin.whitelist': '{n} whitelisted · first replaces · {mode}', 'coin.nockNote': ' · NOCK whitelist {n}',
    'coin.editSettings': 'Edit shared settings', 'coin.setSettings': 'Set pool & wallets',
    'mode.1': 'Mode 1', 'mode.2': 'Mode 2',
    'status.socks': 'SOCKS5 handshake', 'status.detecting': 'Detecting transport', 'status.tls': 'TLS handshake', 'status.awaitingLogin': 'Awaiting login',
    'status.connecting': 'Connecting pool', 'status.switching': 'Switching pool', 'status.connected': 'Pool connected', 'status.loginSent': 'Login sent',
    'status.working': 'Mining', 'status.loginRejected': 'Login rejected', 'status.closed': 'Closed', 'status.coin': 'Detecting',
    'transport.detecting': 'detecting', 'transport.pending': 'pending', 'pool.waiting': 'detecting pool',
    'difficulty.waiting': 'waiting', 'rate.noData': 'no data yet', 'rate.waitingShares': 'waiting for shares',
    'rate.note': 'Observed {m} min · {k} graded shares · {u} unknown{o}', 'rate.openWindow': ' · window open',
    'rate.partial': 'estimated over observed time', 'rate.missing': '{n} missing', 'recovery.label': 'Recovered',
    'wallet.waiting': 'waiting for login', 'wallet.notRecorded': 'not recorded', 'wallet.originalTitle': 'Original: {v}',
    'wallet.replaced': 'wallet replaced', 'wallet.whitelisted': 'whitelisted · kept', 'wallet.passthrough': 'wallet kept', 'wallet.same': 'unchanged',
    'wallet.nockTitle': 'NOCK dual wallet: {a} → {b}', 'wallet.nockKept': 'NOCK ✓ {v} · kept',
    'diff.sourceTarget': 'work derived from the pool target', 'diff.sourcePool': 'pool share difficulty',
    'age.never': 'not yet', 'age.unknown': 'time unknown',
    'age.seconds': '{n}s ago', 'age.minutes': '{m}m {s}s ago', 'age.hours': '{h}h {m}m ago', 'age.days': '{d}d {h}h ago',
    'notice.listenerSaved': 'Listener saved; all listeners accept PRL / QTC', 'notice.listenerSaveFailed': 'Listener saved but failed to start: {msg}',
    'notice.settingsSaved': 'Shared settings saved; active connections switched', 'notice.settingsKept': 'Settings saved, but {n} connection(s) could not switch: {reason} (retrying automatically)', 'error.statusRead': 'Live update failed: {msg}',
    'err.addrNotAvailable': 'Listen address {host} does not belong to this computer. Use a local IP or 0.0.0.0; proxy servers belong in “Upstream SOCKS5 host”.',
    'err.addrInUse': 'Port {target} is already in use by another program or listener; choose a free port.',
    'err.upstreamLoop': 'Listener “{source}” upstream {from} overlaps listener “{dest}” at {to}; upstream may not point at this project. Choose different free ports.',
    'detail.title': 'Connection details',
    'detail.id': 'Connection ID', 'detail.status': 'Status', 'detail.coinListener': 'Coin / listener', 'detail.worker': 'Worker',
    'detail.client': 'Client', 'detail.target': 'Target', 'detail.pool': 'Pool', 'detail.transport': 'Transport',
    'detail.original': 'Original wallet', 'detail.applied': 'Applied wallet', 'detail.nock': 'NOCK dual wallet',
    'detail.difficulty': 'Difficulty', 'detail.lastShare': 'Last share difficulty', 'detail.result': 'Result',
    'detail.speed': 'Live speed', 'detail.bytes': 'Total traffic', 'detail.shares': 'Shares', 'detail.started': 'Started',
    'detail.redirected': 'pool redirected', 'detail.poolKept': 'original pool kept', 'detail.poolSame': 'pool unchanged or pending',
    'detail.walletReplaced': 'wallet replaced', 'detail.walletWhitelisted': 'whitelisted wallet kept', 'detail.walletKept': 'wallet kept',
    'detail.walletSame': 'wallet unchanged or pending', 'detail.recovered': 'Recovered', 'detail.shareTag': 'Share tag',
    'detail.policy': 'Policy', 'detail.forcedPolicy': 'Pool port · original wallet ignored, worker name kept',
    'detail.sharesValue': 'Submitted {s} · Accepted {a} · Rejected {r}',
    'detail.nockKept': '{a} → {b} (kept)', 'detail.nockReplaced': '{a} → {b} (replaced)'
  }
};

const THEME_KEY = 'gateway.theme';
const LANG_KEY = 'gateway.lang';
const HIDE_OFFLINE_KEY = 'gateway.hideOffline';
let hideOffline = localStorage.getItem(HIDE_OFFLINE_KEY) === '1';
let lang = localStorage.getItem(LANG_KEY) === 'en' || localStorage.getItem(LANG_KEY) === 'zh' ? localStorage.getItem(LANG_KEY) : String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
let theme = localStorage.getItem(THEME_KEY) === 'dark' || localStorage.getItem(THEME_KEY) === 'light' ? localStorage.getItem(THEME_KEY) : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function t(key, params = {}) {
  const text = I18N[lang]?.[key] ?? I18N.zh[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])));
}
const locale = () => (lang === 'zh' ? 'zh-CN' : 'en-US');

const $ = selector => document.querySelector(selector);
const listenerForm = $('#listenerForm');
const settingsForm = $('#settingsForm');
let state = null;
let selectedConnection = null;
let streamLive = false;
let syncStateName = 'connecting';
let serverTimeAnchor = Date.now();
let timeAnchorReceived = performance.now();
const traffic = [];

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function size(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MiB`;
  return `${(bytes / 1073741824).toFixed(2)} GiB`;
}
function target(host, port) { return host ? `${host.includes(':') ? `[${host}]` : host}:${port || '—'}` : t('pool.waiting'); }
function compact(value, length = 23) { return value?.length > length ? `${value.slice(0, 12)}…${value.slice(-7)}` : value || '—'; }
function walletAddress(value) { return String(value || '').split('+')[0].split('.')[0]; }
function difficultyText(value) { return value > 0 ? new Intl.NumberFormat(locale(), { maximumFractionDigits: 3 }).format(value) : t('difficulty.waiting'); }
function hashrateText(value) {
  if (value === null || value === undefined) return t('rate.noData');
  const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit++; }
  return `${value.toFixed(2)} ${units[unit]}`;
}
function rateMarkup(label, rate) {
  const minutes = Math.max(1, Math.floor((rate?.sampleSeconds || 0) / 60));
  const note = !rate?.sampleSeconds ? t('rate.waitingShares') : t('rate.note', { m: minutes, k: rate.knownShares, u: rate.unknownShares, o: rate.fullWindow ? '' : t('rate.openWindow') });
  return `<p class="whitespace-nowrap" title="${escapeHtml(note)}"><span class="mr-1 text-[10px] text-slate-500 dark:text-slate-400">${label}</span>${hashrateText(rate?.rate)}${rate?.sampleSeconds && !rate.fullWindow ? `<span class="ml-1 text-amber-700 dark:text-amber-400" title="${t('rate.partial')}">*</span>` : ''}${rate?.unknownShares ? `<span class="ml-1 text-[10px] text-amber-700 dark:text-amber-400">${t('rate.missing', { n: rate.unknownShares })}</span>` : ''}</p>`;
}
function recoveryMarkup(entry) {
  return entry.workerName === 'devfee' ? `<p class="mt-2"><span class="badge bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">${t('recovery.label')}</span></p>` : '';
}
function walletMarkup(original, actual, replaced, passthrough = false, whitelisted = false) {
  if (!actual) return `<span class="text-slate-500 dark:text-slate-400">${t('wallet.waiting')}</span>`;
  const targetWallet = `<p class="max-w-60 truncate font-mono text-emerald-700 dark:text-emerald-400" title="${escapeHtml(actual)}"><span aria-label="current">✓</span> ${escapeHtml(compact(actual, 30))}</p>`;
  return replaced
    ? `<div><p class="max-w-60 truncate font-mono text-rose-700 dark:text-rose-400" title="${escapeHtml(t('wallet.originalTitle', { v: original || t('wallet.notRecorded') }))}"><span aria-label="replaced">✕</span> ${escapeHtml(compact(original, 30))}</p><div class="mt-1">${targetWallet}</div><span class="mt-1 block text-[10px] text-emerald-700 dark:text-emerald-400">${t('wallet.replaced')}</span></div>`
    : `<div>${targetWallet}<span class="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">${whitelisted ? t('wallet.whitelisted') : passthrough ? t('wallet.passthrough') : t('wallet.same')}</span></div>`;
}
function nockMarkup(entry) {
  if (!entry?.dualMining || !entry.nockWallet) return '';
  const title = t('wallet.nockTitle', { a: entry.originalNockWallet || t('wallet.notRecorded'), b: entry.nockWallet });
  return entry.nockWalletReplaced
    ? `<p class="mt-1 max-w-60 truncate font-mono text-[10px] text-rose-700 dark:text-rose-400" title="${escapeHtml(title)}"><span aria-label="nock replaced">✕</span> ${escapeHtml(compact(entry.originalNockWallet, 16))} <span class="text-emerald-700 dark:text-emerald-400">→ ✓ ${escapeHtml(compact(entry.nockWallet, 16))}</span></p>`
    : `<p class="mt-1 max-w-60 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title="${escapeHtml(title)}">${t('wallet.nockKept', { v: escapeHtml(compact(entry.nockWallet, 20)) })}</p>`;
}
function submitAge(time, submitted = 0) {
  if (!time || !Number.isFinite(Date.parse(time))) return submitted > 0 ? t('age.unknown') : t('age.never');
  const now = serverTimeAnchor + performance.now() - timeAnchorReceived;
  const seconds = Math.max(0, Math.floor((now - Date.parse(time)) / 1000));
  if (seconds < 60) return t('age.seconds', { n: seconds });
  if (seconds < 3600) return t('age.minutes', { m: Math.floor(seconds / 60), s: seconds % 60 });
  if (seconds < 86400) return t('age.hours', { h: Math.floor(seconds / 3600), m: Math.floor(seconds % 3600 / 60) });
  return t('age.days', { d: Math.floor(seconds / 86400), h: Math.floor(seconds % 86400 / 3600) });
}
function compactAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
// 环形进度：0.9 倍平均间隔时 50%、1.8 倍 100%（无级连续），颜色 ≤0.9 绿、≤1.8 黄、>1.8 红
function submitRing(time, interval, submitted = 0) {
  const hasTime = time && Number.isFinite(Date.parse(time));
  const age = submitAge(time, submitted);
  const average = Number(interval);
  if (!hasTime || !(average > 0)) return `<span class="text-xs text-slate-500 dark:text-slate-400">${age}</span>`;
  const now = serverTimeAnchor + performance.now() - timeAnchorReceived;
  const elapsed = Math.max(0, Math.floor((now - Date.parse(time)) / 1000));
  const ratio = elapsed / average;
  const color = ratio <= 0.9 ? 'text-teal-500' : ratio <= 1.8 ? 'text-amber-500' : 'text-rose-500';
  const circumference = 2 * Math.PI * 13;
  const progress = Math.min(1, ratio / 1.8);
  const dash = progress * circumference;
  const title = t('tip.shareRing', { elapsed: age, avg: compactAge(Math.round(average)) });
  return `<span class="inline-flex items-center gap-2" title="${escapeHtml(title)}">
    <svg viewBox="0 0 32 32" class="size-8 -rotate-90 ring-color ${color}" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="4"></circle>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${circumference.toFixed(2)}" data-ring-fill></circle>
    </svg>
    <span class="text-xs font-medium ring-color ${color}" data-ring-age>${compactAge(elapsed)}</span>
  </span>`;
}
// 逐帧（约 60fps）更新环形进度：连续无级，不依赖每秒重绘
function updateShareClocks() {
  const circumference = 2 * Math.PI * 13;
  for (const element of document.querySelectorAll('[data-last-submit]')) {
    const time = element.dataset.lastSubmit;
    const average = Number(element.dataset.shareInterval);
    const submitted = Number(element.dataset.submitted);
    const parsed = time ? Date.parse(time) : Number.NaN;
    if (!time || !Number.isFinite(parsed) || !(average > 0)) {
      const text = submitAge(time, submitted);
      if (element.textContent !== text) element.textContent = text;
      continue;
    }
    const now = serverTimeAnchor + performance.now() - timeAnchorReceived;
    const elapsedMs = Math.max(0, now - parsed);
    const ratio = elapsedMs / 1000 / average;
    const fill = element.querySelector('[data-ring-fill]');
    if (fill) fill.setAttribute('stroke-dasharray', `${(Math.min(1, ratio / 1.8) * circumference).toFixed(2)} ${circumference.toFixed(2)}`);
    const band = ratio <= 0.9 ? 'text-teal-500' : ratio <= 1.8 ? 'text-amber-500' : 'text-rose-500';
    if (element.dataset.band !== band) {
      element.dataset.band = band;
      for (const node of element.querySelectorAll('.ring-color')) {
        node.classList.remove('text-teal-500', 'text-amber-500', 'text-rose-500');
        node.classList.add(band);
      }
    }
    const label = element.querySelector('[data-ring-age]');
    if (label) {
      const text = compactAge(Math.floor(elapsedMs / 1000));
      if (label.textContent !== text) label.textContent = text;
    }
  }
}
function badge(label, color = 'slate') {
  const styles = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-900',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900'
  };
  return `<span class="badge ${styles[color] || styles.slate}">${escapeHtml(label)}</span>`;
}
function notice(message, error = false) {
  const element = $('#notice');
  element.textContent = message;
  element.className = `rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300' : 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300'}`;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => element.classList.add('hidden'), 7000);
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function statusLabel(session) {
  const mapped = { 'socks-handshake': 'socks', detecting: 'detecting', 'tls-handshake': 'tls', 'awaiting-login': 'awaitingLogin', 'connecting-pool': 'connecting', 'switching-pool': 'switching', connected: 'connected', 'login-sent': 'loginSent', working: 'working', 'login-rejected': 'loginRejected', closed: 'closed' }[session.state];
  return mapped ? t(`status.${mapped}`) : session.state;
}

function listenerErrorText(message, input) {
  if (!message) return '';
  if (message.includes('EADDRNOTAVAIL')) return t('err.addrNotAvailable', { host: input.listenHost });
  if (message.includes('EADDRINUSE')) return t('err.addrInUse', { target: target(input.listenHost, input.listenPort) });
  if (message.includes('上游 SOCKS5 不能指向本项目')) {
    const local = host => ['127.0.0.1', 'localhost', '::1'].includes(host);
    const rules = [...(state?.listeners || []).filter(rule => rule.id !== input.id), input];
    for (const source of rules) {
      if (!source.enabled || source.mode !== 'socks5' || !local(source.socksHost)) continue;
      const destination = rules.find(rule => rule.enabled && Number(rule.listenPort) === Number(source.socksPort) && (local(rule.listenHost) || ['0.0.0.0', '::'].includes(rule.listenHost)));
      if (destination) return t('err.upstreamLoop', { source: source.name, from: target(source.socksHost, source.socksPort), dest: destination.name, to: target(destination.listenHost, destination.listenPort) });
    }
  }
  return message;
}

function render() {
  if (!state) return;
  const { totals, sessions, listeners } = state;
  $('#activeCount').textContent = sessions.filter(session => !session.clientEnded).length;
  const activeSessions = sessions.filter(session => !session.clientEnded);
  const devfeeSessions = activeSessions.filter(session => session.workerName === 'devfee' || session.knownDevWallet).length;
  $('#minerCount').textContent = activeSessions.length;
  $('#minerDetail').textContent = t('card.minersDetail', { a: activeSessions.length - devfeeSessions, b: devfeeSessions });
  $('#runningCount').textContent = t('card.listenersRunning', { n: listeners.filter(item => item.status === 'running').length });
  $('#totalSpeed').textContent = `${size(totals.speedUp + totals.speedDown)}/s`;
  $('#directionSpeed').textContent = `↑ ${size(totals.speedUp)}/s · ↓ ${size(totals.speedDown)}/s`;
  $('#rewriteCount').innerHTML = `${totals.walletChanges} <span class="text-lg text-slate-500 dark:text-slate-400">/ ${totals.redirected}</span>`;
  $('#shareCount').textContent = totals.accepted;
  $('#shareDetail').textContent = t('card.sharesDetail', { s: totals.submitted, a: totals.accepted, r: totals.rejected });
  $('#trafficTotal').textContent = t('traffic.total', { v: size(totals.bytesUp + totals.bytesDown) });
  $('#listenerCount').textContent = t('listeners.count', { n: listeners.length });
  $('#lastUpdate').textContent = t('footer.updated', { time: new Date(state.time).toLocaleTimeString(locale(), { hour12: false }) });
  if (state.memory) $('#memoryUsage').textContent = t('footer.memory', { rss: size(state.memory.rss), heap: size(state.memory.heapUsed) });
  const minutes = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 60000);
  $('#uptime').textContent = minutes >= 60 ? t('uptime.hours', { h: Math.floor(minutes / 60), m: minutes % 60 }) : t('uptime.minutes', { n: minutes });
  for (const coin of ['prl', 'qtc']) renderCoin(coin);
  $('#certificateMode').textContent = state.certificate.mode === 'generated' ? state.certificate.source === 'bundled' ? t('tls.modeBundled') : t('tls.modeGenerated') : state.certificate.isCA ? t('tls.modeCustomCa') : t('tls.modeCustomServer');
  $('#certificateExpiry').textContent = t('tls.expiry', { date: new Date(state.certificate.validTo).toLocaleDateString(locale()) });
  renderListeners();
  renderMiners();
  renderConnections();
  if ($('#connectionDialog').open && selectedConnection) {
    selectedConnection = sessions.find(item => item.id === selectedConnection.id) || { ...selectedConnection, state: 'closed', speedUp: 0, speedDown: 0 };
    renderConnectionDetail();
  }
}
function renderCoin(coin) {
  const profile = state.settings.coins[coin];
  const active = state.sessions.filter(item => item.coin === coin && !item.clientEnded).length;
  const color = coin === 'prl' ? 'teal' : 'violet';
  const nockNote = coin === 'prl' ? t('coin.nockNote', { n: state.settings.nock?.wallets?.length || 0 }) : '';
  $(`#${coin}Card`).innerHTML = `<div class="flex items-center justify-between"><div class="flex items-center gap-2.5"><span class="flex size-9 items-center justify-center rounded-xl ${coin === 'prl' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'} font-bold">${coin === 'prl' ? 'P' : 'Q'}</span><div><p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${t('coin.poolTitle', { coin: coin.toUpperCase() })}</p><p class="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">${t('coin.connections', { n: active })}</p></div></div>${badge(profile.enabled ? t('common.enabled') : t('common.disabled'), profile.enabled ? color : 'slate')}</div><p class="mt-4 truncate font-mono text-sm text-slate-800 dark:text-slate-200">${profile.poolHost ? escapeHtml(target(profile.poolHost, profile.poolPort)) : t('coin.waitingPool')}</p><div class="mt-2 flex items-center justify-between gap-2"><p class="min-w-0 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title="${escapeHtml(profile.wallet)}">${escapeHtml(compact(profile.wallets?.[0] || profile.wallet, 40))}</p><span class="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">${profile.poolTls ? 'TLS' : 'TCP'}</span></div><p class="mt-2 text-[10px] text-slate-500 dark:text-slate-400">${t('coin.whitelist', { n: profile.wallets?.length || (profile.wallet ? 1 : 0), mode: state.settings.routing?.mode === 'known-wallets' ? t('mode.1') : t('mode.2') })}${nockNote}</p><button data-settings class="mt-4 text-xs font-medium ${coin === 'prl' ? 'text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300' : 'text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300'}">${profile.poolHost ? t('coin.editSettings') : t('coin.setSettings')} <span class="ml-1">↗</span></button>`;
}
function renderListeners() {
  $('#listeners').innerHTML = state.listeners.length ? state.listeners.map(rule => `<article class="grid items-center gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><div><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(rule.name)}</h3>${rule.protocol === 'stratum' ? badge(t('listener.typeStratum'), 'violet') : ''}${badge(rule.status === 'running' ? t('listener.running') : rule.status === 'error' ? t('listener.startFailed') : t('listener.stopped'), rule.status === 'running' ? 'teal' : rule.status === 'error' ? 'rose' : 'slate')}</div><p class="mt-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">${escapeHtml(target(rule.listenHost, rule.listenPort))}</p><p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">${rule.protocol === 'stratum' ? t('listener.stratumMode') : `${rule.mode === 'socks5' ? t('listener.upstream', { target: escapeHtml(target(rule.socksHost, rule.socksPort)) }) : t('listener.direct')} · ${rule.listenUsername ? t('listener.authRequired') : t('listener.authNone')}`}</p>${rule.error ? `<p class="mt-2 break-all text-xs text-rose-700 dark:text-rose-400">${escapeHtml(listenerErrorText(rule.error, rule))}</p>` : ''}</div><div class="grid grid-cols-2 gap-4"><div><p class="text-[10px] text-slate-500 dark:text-slate-400">${t('listener.activeTotal')}</p><p class="mt-1 text-sm text-slate-700 dark:text-slate-300">${rule.active} <span class="text-slate-500 dark:text-slate-400">/ ${rule.total}</span></p></div><div><p class="text-[10px] text-slate-500 dark:text-slate-400">${t('listener.speed')}</p><p class="mt-1 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300">${size(rule.speedUp)}/s <span class="text-slate-500 dark:text-slate-400">/</span> ${size(rule.speedDown)}/s</p></div></div><div class="flex gap-2"><button data-listener-action="edit" data-id="${rule.id}" class="btn">${t('btn.edit')}</button><button data-listener-action="toggle" data-id="${rule.id}" class="btn">${rule.enabled ? t('btn.disable') : t('btn.enable')}</button><button data-listener-action="delete" data-id="${rule.id}" aria-label="${t('btn.delete')} ${escapeHtml(rule.name)}" class="px-2 text-slate-500 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-400">×</button></div></article>`).join('') : `<div class="flex flex-col items-center py-10 text-center"><span class="mb-3 flex size-12 items-center justify-center rounded-2xl border border-slate-300 text-2xl text-slate-500 dark:border-slate-700 dark:text-slate-400">↔</span><p class="text-sm font-medium text-slate-700 dark:text-slate-300">${t('listeners.emptyTitle')}</p><p class="mt-2 max-w-md px-5 text-xs leading-6 text-slate-500 dark:text-slate-400">${t('listeners.emptyDesc')}</p><button data-add-listener class="btn-primary mt-5">${t('btn.addListener')}</button></div>`;
}
function renderConnections() {
  if (!state) return;
  const filter = $('#coinFilter').value;
  const query = $('#connectionSearch').value.trim().toLowerCase();
  const sessions = state.sessions.filter(item => !item.clientEnded && (filter === 'all' || item.coin === filter) && (!query || [item.client, item.originalHost, item.poolHost, item.originalWallet, item.appliedWallet, item.nockWallet, item.listenerName].some(value => String(value).toLowerCase().includes(query))));
  $('#connectionCount').textContent = t('connections.count', { n: sessions.length });
  $('#connections').innerHTML = sessions.length ? sessions.map(session => `<tr class="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"><td class="px-5 py-4">${badge(session.coin?.toUpperCase() || t('status.coin'), session.coin === 'prl' ? 'teal' : session.coin === 'qtc' ? 'violet' : 'slate')}<p class="mt-1.5 ${session.state === 'login-rejected' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">${escapeHtml(statusLabel(session))}</p></td><td class="px-4 py-4"><p class="font-mono text-slate-700 dark:text-slate-300">${escapeHtml(session.client)}</p><p class="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(session.listenerName)}</p></td><td class="px-4 py-4"><p class="max-w-60 truncate font-mono text-slate-500 dark:text-slate-400" title="${escapeHtml(target(session.originalHost, session.originalPort))}">${escapeHtml(target(session.originalHost, session.originalPort))}</p><p class="mt-1.5 max-w-60 truncate font-mono text-slate-800 dark:text-slate-200" title="${escapeHtml(target(session.poolHost, session.poolPort))}"><span class="text-teal-700 dark:text-teal-400">→</span> ${session.poolHost ? escapeHtml(target(session.poolHost, session.poolPort)) : t('pool.waiting')}</p><p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">${session.clientTransport === 'detecting' ? t('transport.detecting') : session.clientTransport.toUpperCase()} → ${session.poolTransport?.toUpperCase() || t('transport.pending')}</p></td><td class="px-4 py-4">${walletMarkup(walletAddress(session.originalWallet), session.walletAddress || walletAddress(session.appliedWallet), session.walletReplaced, session.passthrough, session.whitelisted)}${nockMarkup(session)}</td><td class="whitespace-nowrap px-4 py-4 font-mono text-slate-700 dark:text-slate-300"><p><span class="text-teal-700 dark:text-teal-400">↑</span> ${size(session.speedUp)}/s</p><p class="mt-1.5"><span class="text-violet-600 dark:text-violet-400">↓</span> ${size(session.speedDown)}/s</p></td><td class="px-4 py-4 text-slate-600 dark:text-slate-300"><span class="text-teal-700 dark:text-teal-400">${session.accepted}</span> / <span class="${session.rejected ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">${session.rejected}</span>${recoveryMarkup(session)}</td><td class="px-4 py-4"><button data-connection="${session.id}" class="text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">${t('btn.detail')}</button></td></tr>`).join('') : `<tr><td colspan="7" class="py-12 text-center"><p class="text-sm text-slate-600 dark:text-slate-300">${state.sessions.some(item => !item.clientEnded) ? t('connections.noMatch') : t('connections.waiting')}</p><p class="mt-2 text-xs text-slate-500 dark:text-slate-400">${state.sessions.some(item => !item.clientEnded) ? t('connections.noMatchHint') : t('connections.waitingHint')}</p></td></tr>`;
}
function renderMinerTotals() {
  const container = $('#minerTotals');
  if (!container) return;
  const totals = { prl: { rate1h: 0, rate6h: 0 }, qtc: { rate1h: 0, rate6h: 0 } };
  for (const miner of state.miners || []) {
    const entry = totals[miner.coin];
    if (!entry) continue;
    entry.rate1h += miner.hashrate1h?.rate || 0;
    entry.rate6h += miner.hashrate6h?.rate || 0;
  }
  container.title = t('miners.totalNote');
  container.innerHTML = ['prl', 'qtc'].map(coin => {
    const color = coin === 'prl' ? 'text-teal-700 dark:text-teal-400' : 'text-violet-700 dark:text-violet-400';
    const entry = totals[coin];
    return `<p><span class="${color} font-semibold">${coin.toUpperCase()}</span> <span class="text-slate-500 dark:text-slate-400">${t('miners.total')}</span> ${hashrateText(entry.rate1h)} <span class="text-slate-400 dark:text-slate-500">1h</span> · ${hashrateText(entry.rate6h)} <span class="text-slate-400 dark:text-slate-500">6h</span></p>`;
  }).join('');
}
function renderMiners() {
  const all = state.miners || [];
  const miners = hideOffline ? all.filter(miner => miner.active) : all;
  renderMinerTotals();
  if (!miners.length) {
    $('#miners').innerHTML = `<tr><td colspan="11" class="py-8 text-center text-xs text-slate-500 dark:text-slate-400">${all.length ? t('miners.hiddenAll', { n: all.length }) : t('miners.empty')}</td></tr>`;
    return;
  }
  $('#miners').innerHTML = miners.map(miner => `
    <tr class="border-t border-slate-200 dark:border-slate-800">
      <td class="px-5 py-4"><p class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(miner.workerName || t('miner.unnamed'))}</p><p class="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(miner.clientHost)}</p></td>
      <td class="px-4 py-4">${badge(miner.coin.toUpperCase(), miner.coin === 'prl' ? 'teal' : 'violet')}<div class="mt-1.5">${badge(miner.active ? t('miner.online', { n: miner.active }) : t('miner.offline'), miner.active ? 'teal' : 'slate')}</div></td>
      <td class="max-w-64 px-4 py-4">${walletMarkup(miner.originalWalletAddress, miner.walletAddress, miner.walletReplaced, miner.passthrough, miner.whitelisted)}${nockMarkup(miner)}</td>
      <td class="px-4 py-4 font-mono text-slate-700 dark:text-slate-300" title="${escapeHtml(miner.difficultySource === 'target' ? t('diff.sourceTarget') : t('diff.sourcePool'))}">${(miner.difficulties?.length ? miner.difficulties : [miner.difficulty]).map(difficultyText).join('<br>')}</td>
      <td class="space-y-1 px-4 py-4 font-mono text-slate-700 dark:text-slate-300">${rateMarkup('1h', miner.hashrate1h)}${rateMarkup('6h', miner.hashrate6h)}</td>
      <td class="px-4 py-4 text-slate-700 dark:text-slate-300">${miner.jobs || 0}</td>
      <td class="px-4 py-4 text-slate-700 dark:text-slate-300">${miner.submitted}</td>
      <td class="px-4 py-4 text-teal-700 dark:text-teal-400">${miner.accepted}${recoveryMarkup(miner)}</td>
      <td class="px-4 py-4 ${miner.rejected ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">${miner.rejected}</td>
      <td class="whitespace-nowrap px-4 py-4 text-slate-700 dark:text-slate-300"><span data-last-submit="${escapeHtml(miner.lastSubmitAt || '')}" data-share-interval="${Number(miner.shareInterval) > 0 ? Number(miner.shareInterval) : ''}" data-submitted="${miner.submitted}" title="${miner.lastSubmitAt ? escapeHtml(new Date(miner.lastSubmitAt).toLocaleString(locale(), { hour12: false })) : ''}">${submitRing(miner.lastSubmitAt, miner.shareInterval, miner.submitted)}</span></td>
      <td class="px-4 py-4 text-[10px] text-slate-500 dark:text-slate-400">${new Date(miner.lastSeen).toLocaleTimeString(locale(), { hour12: false })}</td>
    </tr>`).join('');
}
function renderConnectionDetail() {
  const session = selectedConnection;
  const entries = [
    [t('detail.id'), session.id], [t('detail.status'), statusLabel(session)], [t('detail.coinListener'), `${session.coin?.toUpperCase() || t('status.coin')} / ${session.listenerName}`],
    [t('detail.worker'), session.workerName || t('miner.unnamed')], [t('detail.client'), session.client], [t('detail.target'), target(session.originalHost, session.originalPort)], [t('detail.pool'), session.poolHost ? target(session.poolHost, session.poolPort) : t('pool.waiting')],
    [t('detail.transport'), `${session.clientTransport.toUpperCase()} → ${session.poolTransport?.toUpperCase() || t('transport.pending')}`],
    [t('detail.original'), session.originalWallet || t('wallet.waiting')], [t('detail.applied'), session.appliedWallet || t('wallet.waiting')],
    ...(session.dualMining ? [[t('detail.nock'), session.nockWalletReplaced ? t('detail.nockReplaced', { a: session.originalNockWallet || '—', b: session.nockWallet || '—' }) : t('detail.nockKept', { a: session.originalNockWallet || '—', b: session.nockWallet || '—' })]] : []),
    ...(session.forcedWallet ? [[t('detail.policy'), t('detail.forcedPolicy')]] : []),
    [t('detail.difficulty'), difficultyText(session.difficulty)], [t('detail.lastShare'), difficultyText(session.lastShareDifficulty)],
    [t('detail.result'), `${session.redirected ? t('detail.redirected') : session.passthrough ? t('detail.poolKept') : t('detail.poolSame')} · ${session.walletReplaced ? t('detail.walletReplaced') : session.whitelisted ? t('detail.walletWhitelisted') : session.passthrough ? t('detail.walletKept') : t('detail.walletSame')}`],
    [t('detail.speed'), `↑ ${size(session.speedUp)}/s · ↓ ${size(session.speedDown)}/s`], [t('detail.bytes'), `↑ ${size(session.bytesUp)} · ↓ ${size(session.bytesDown)}`],
    [t('detail.shares'), t('detail.sharesValue', { s: session.submitted, a: session.accepted, r: session.rejected })], [t('detail.started'), new Date(session.startedAt).toLocaleString(locale(), { hour12: false })]
  ];
  if (session.workerName === 'devfee') entries.push([t('detail.shareTag'), t('detail.recovered')]);
  $('#connectionDetail').innerHTML = `<dl class="space-y-4">${entries.map(([label, value]) => `<div class="grid gap-1.5 sm:grid-cols-[110px_1fr]"><dt class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(label)}</dt><dd class="break-all font-mono text-xs leading-5 text-slate-700 dark:text-slate-300">${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}
function drawTraffic(data) {
  const dark = document.documentElement.classList.contains('dark');
  const second = Math.floor(new Date(data.time).getTime() / 1000);
  const sample = { second, rates: [data.totals.speedUp, data.totals.speedDown] };
  if (traffic.at(-1)?.second === second) traffic[traffic.length - 1] = sample;
  else traffic.push(sample);
  while (traffic.length && traffic[0].second < second - 59) traffic.shift();
  const samples = Array.from({ length: 60 }, (_, i) => traffic.find(value => value.second === second - 59 + i)?.rates || [0, 0]);
  const maximum = Math.max(1, ...samples.flat());
  const points = direction => samples.map((sample, i) => `${(i * 360 / 59).toFixed(1)},${(60 - sample[direction] * 54 / maximum).toFixed(1)}`).join(' ');
  $('#trafficChart').innerHTML = `<path d="M0 60H360M0 32H360M0 6H360" stroke="${dark ? '#1e293b' : '#e2e8f0'}" stroke-width="1" fill="none"/><polyline points="${points(1)}" stroke="${dark ? '#a78bfa' : '#7c3aed'}" stroke-width="1.8" fill="none"/><polyline points="${points(0)}" stroke="${dark ? '#2dd4bf' : '#0f766e'}" stroke-width="1.8" fill="none"/>`;
}
function update(data) { state = data; serverTimeAnchor = Date.parse(data.time) || Date.now(); timeAnchorReceived = performance.now(); drawTraffic(data); render(); }
async function refresh() { try { update(await api('/api/status')); } catch (error) { notice(t('error.statusRead', { msg: error.message }), true); } }

function showError(selector, message) { $(selector).textContent = message; $(selector).classList.toggle('hidden', !message); }
function openListener(rule = null) {
  listenerForm.reset();
  listenerForm.elements.id.value = rule?.id || '';
  for (const field of ['name', 'protocol', 'listenHost', 'listenPort', 'mode', 'clientTransport', 'socksHost', 'socksPort', 'socksUsername', 'socksPassword', 'listenUsername', 'listenPassword']) if (rule) listenerForm.elements[field].value = rule[field] ?? '';
  if (!listenerForm.elements.protocol.value) listenerForm.elements.protocol.value = 'socks5';
  listenerForm.elements.enabled.checked = rule?.enabled ?? true;
  $('#listenerTitle').textContent = rule ? t('dialog.editListener') : t('dialog.addListener');
  toggleUpstream();
  toggleProtocol();
  showError('#listenerError', '');
  $('#listenerDialog').showModal();
}
function toggleUpstream() {
  const enabled = listenerForm.elements.mode.value === 'socks5';
  $('#upstreamFields').classList.toggle('hidden', !enabled);
  listenerForm.elements.socksHost.required = enabled;
  listenerForm.elements.socksPort.required = enabled;
}
function toggleProtocol() {
  const stratum = listenerForm.elements.protocol.value === 'stratum';
  $('#stratumFields').classList.toggle('hidden', !stratum);
  $('#listenAuthDetails').classList.toggle('hidden', stratum);
  if (stratum) {
    listenerForm.elements.listenUsername.value = '';
    listenerForm.elements.listenPassword.value = '';
  }
}
async function saveListener(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  const input = {};
  try {
    for (const field of ['name', 'protocol', 'listenHost', 'listenPort', 'mode', 'clientTransport', 'socksHost', 'socksPort', 'socksUsername', 'socksPassword', 'listenUsername', 'listenPassword']) input[field] = listenerForm.elements[field].value;
    input.enabled = listenerForm.elements.enabled.checked;
    const id = listenerForm.elements.id.value;
    input.id = id;
    const result = await api(id ? `/api/listeners/${id}` : '/api/listeners', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
    $('#listenerDialog').close();
    notice(result.listener.status === 'error' ? t('notice.listenerSaveFailed', { msg: listenerErrorText(result.listener.error, input) }) : t('notice.listenerSaved'), result.listener.status === 'error');
    await refresh();
  } catch (error) { showError('#listenerError', listenerErrorText(error.message, input)); }
  finally { button.disabled = false; }
}

function coinForm(coin) {
  const label = coin.toUpperCase();
  return `<section class="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div class="flex items-center justify-between"><h3 class="text-sm font-semibold ${coin === 'prl' ? 'text-teal-700 dark:text-teal-400' : 'text-violet-700 dark:text-violet-400'}">${label}</h3><label class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input name="${coin}_enabled" type="checkbox" class="size-4 accent-teal-600">${t('coin.enable')}</label></div><div class="grid grid-cols-[1fr_90px] gap-3"><label class="label"><span>${t('coin.poolHost')}</span><input name="${coin}_poolHost" placeholder="pool.example.com" class="field"></label><label class="label"><span>${t('coin.port')}</span><input name="${coin}_poolPort" type="number" min="1" max="65535" placeholder="3333" class="field"></label></div><label class="label"><span>${t('coin.wallets')}</span><textarea name="${coin}_wallet" rows="4" placeholder="${escapeHtml(t('coin.walletsPlaceholder', { coin: label }))}" class="field resize-y font-mono text-xs"></textarea></label><p class="text-[10px] leading-5 text-slate-500 dark:text-slate-400">${t('coin.walletsHint', { extra: coin === 'prl' ? t('coin.walletsExtraPrl') : t('coin.walletsExtraQtc') })}</p><label class="label"><span>${t('coin.poolPassword')}</span><input name="${coin}_poolPassword" type="password" class="field" autocomplete="new-password"></label><label class="label"><span>${t('coin.transport')}</span><select name="${coin}_poolTransport" class="field"><option value="tls">TLS</option><option value="tcp">${t('form.tcp')}</option></select></label><details class="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><summary class="text-xs text-slate-500 dark:text-slate-400">${t('coin.tlsDetails')}</summary><div class="mt-3 space-y-3"><label class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input name="${coin}_poolVerifyTls" type="checkbox" checked class="size-4 accent-teal-600">${t('coin.verifyTls')}</label><label class="label"><span>${t('coin.servername')}</span><input name="${coin}_poolServername" placeholder="${escapeHtml(t('coin.servernamePlaceholder'))}" class="field"></label><label class="label"><span>${t('coin.caFile')}</span><input name="${coin}_caFile" type="file" accept=".pem,.crt,.cer" class="mt-2 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"></label><p id="${coin}_caNote" class="text-[10px] text-slate-500 dark:text-slate-400"></p><label class="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400"><input name="${coin}_clearPoolCa" type="checkbox" class="accent-teal-600">${t('coin.clearCa')}</label></div></details></section>`;
}
$('#coinForms').innerHTML = ['prl', 'qtc'].map(coinForm).join('');
function toggleRequired() {
  for (const coin of ['prl', 'qtc']) for (const field of ['poolHost', 'poolPort', 'wallet']) settingsForm.elements[`${coin}_${field}`].required = settingsForm.elements[`${coin}_enabled`].checked;
}
function walletLines(value) { return [...new Set(value.split(/[\r\n,，]+/).map(line => line.trim()).filter(Boolean))]; }
function toggleRouting() {
  const knownOnly = settingsForm.elements.routingMode.value === 'known-wallets';
  $('#knownWalletFields').classList.remove('hidden');
  $('#routingNote').textContent = knownOnly ? t('settings.mode1Note') : t('settings.mode2Note');
}
function toggleCertificate() { $('#customCertificateFields').classList.toggle('hidden', settingsForm.elements.certificateMode.value !== 'custom'); }
function openSettings(openCertificate = false) {
  if (!state) return;
  settingsForm.reset();
  for (const coin of ['prl', 'qtc']) {
    const profile = state.settings.coins[coin];
    settingsForm.elements[`${coin}_enabled`].checked = profile.enabled;
    settingsForm.elements[`${coin}_poolVerifyTls`].checked = profile.poolVerifyTls;
    settingsForm.elements[`${coin}_poolTransport`].value = profile.poolTls ? 'tls' : 'tcp';
    for (const field of ['poolHost', 'poolPort', 'poolPassword', 'poolServername']) settingsForm.elements[`${coin}_${field}`].value = profile[field] ?? '';
    settingsForm.elements[`${coin}_wallet`].value = (profile.wallets?.length ? profile.wallets : profile.wallet ? [profile.wallet] : []).join('\n');
    settingsForm.elements[`${coin}_knownWallets`].value = (state.settings.routing?.knownWallets?.[coin] || []).join('\n');
    $(`#${coin}_caNote`).textContent = profile.poolCaConfigured ? t('coin.caSaved') : t('coin.caDefault');
  }
  settingsForm.elements.routingMode.value = state.settings.routing?.mode || 'unified';
  settingsForm.elements.nock_wallets.value = (state.settings.nock?.wallets?.length ? state.settings.nock.wallets : state.settings.nock?.wallet ? [state.settings.nock.wallet] : []).join('\n');
  settingsForm.elements.certificateMode.value = state.settings.tls.mode;
  settingsForm.elements.certPassphrase.value = state.settings.tls.passphrase;
  $('#savedCertificateNote').textContent = state.settings.tls.customConfigured ? t('settings.savedCert') : t('settings.needCert');
  $('#tlsOptions').open = openCertificate;
  toggleRequired();
  toggleRouting();
  toggleCertificate();
  showError('#settingsError', '');
  $('#settingsDialog').showModal();
  if (openCertificate) $('#tlsOptions').scrollIntoView({ block: 'nearest' });
}
async function saveSettings(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const input = { coins: {}, routing: { mode: settingsForm.elements.routingMode.value, knownWallets: {} }, tls: { mode: settingsForm.elements.certificateMode.value, passphrase: settingsForm.elements.certPassphrase.value } };
    for (const coin of ['prl', 'qtc']) {
      const profile = { enabled: settingsForm.elements[`${coin}_enabled`].checked, poolTls: settingsForm.elements[`${coin}_poolTransport`].value === 'tls', poolVerifyTls: settingsForm.elements[`${coin}_poolVerifyTls`].checked, clearPoolCa: settingsForm.elements[`${coin}_clearPoolCa`].checked };
      for (const field of ['poolHost', 'poolPort', 'poolPassword', 'poolServername']) profile[field] = settingsForm.elements[`${coin}_${field}`].value;
      profile.wallets = walletLines(settingsForm.elements[`${coin}_wallet`].value);
      profile.wallet = profile.wallets[0] || '';
      input.routing.knownWallets[coin] = walletLines(settingsForm.elements[`${coin}_knownWallets`].value);
      const file = settingsForm.elements[`${coin}_caFile`].files[0];
      if (file) { profile.poolCaPem = await file.text(); profile.clearPoolCa = false; }
      input.coins[coin] = profile;
    }
    const nockWallets = walletLines(settingsForm.elements.nock_wallets.value);
    input.nock = { wallets: nockWallets };
    if (settingsForm.elements.certFile.files[0]) input.tls.certPem = await settingsForm.elements.certFile.files[0].text();
    if (settingsForm.elements.keyFile.files[0]) input.tls.keyPem = await settingsForm.elements.keyFile.files[0].text();
    const result = await api('/api/settings', { method: 'PUT', body: JSON.stringify(input) });
    $('#settingsDialog').close();
    const reload = result?.reload;
    if (reload && reload.kept > 0) notice(t('notice.settingsKept', { n: reload.kept, reason: reload.errors?.[0] || '—' }), true);
    else notice(t('notice.settingsSaved'));
    await refresh();
  } catch (error) { showError('#settingsError', error.message); }
  finally { button.disabled = false; }
}

const THEME_ICONS = {
  moon: '<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true"><path d="M10 2.2a7.8 7.8 0 1 0 7.8 7.8 6.4 6.4 0 0 1-7.8-7.8Z"/></svg>',
  sun: '<svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.6" fill="currentColor" stroke="none"/><path d="M10 1.6v2.2M10 16.2v2.2M1.6 10h2.2M16.2 10h2.2M3.9 3.9l1.6 1.6M14.5 14.5l1.6 1.6M16.1 3.9l-1.6 1.6M5.5 14.5l-1.6 1.6"/></svg>'
};
function applyTheme() {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  $('#themeBtn').innerHTML = theme === 'dark' ? THEME_ICONS.sun : THEME_ICONS.moon;
}
function setSyncState(name) { syncStateName = name; syncStateApply(); }
function syncStateApply() {
  $('#syncState').textContent = t(`sync.${syncStateName}`);
  $('#syncState').className = syncStateName === 'live' ? 'text-xs text-teal-700 dark:text-teal-400' : syncStateName === 'retry' ? 'text-xs text-amber-700 dark:text-amber-400' : 'text-xs text-slate-500 dark:text-slate-400';
}
function applyLanguage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('doc.title');
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  $('#langBtn').textContent = lang === 'zh' ? 'EN' : '中文';
  $('#langBtn').title = t('lang.toggle');
  $('#themeBtn').title = t('theme.toggle');
  if (!$('#settingsDialog').open) $('#coinForms').innerHTML = ['prl', 'qtc'].map(coinForm).join('');
  syncStateApply();
  if (state) render();
}

$('#themeBtn').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  if (state) drawTraffic(state);
});
$('#langBtn').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem(LANG_KEY, lang);
  applyLanguage();
});

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) return $(`#${close.dataset.close}`).close();
  if (event.target.closest('[data-settings]')) return openSettings();
  if (event.target.closest('[data-add-listener]')) return openListener();
  const connection = event.target.closest('[data-connection]');
  if (connection) {
    selectedConnection = state.sessions.find(item => item.id === connection.dataset.connection);
    if (selectedConnection) { renderConnectionDetail(); $('#connectionDialog').showModal(); }
    return;
  }
  const action = event.target.closest('[data-listener-action]');
  if (!action) return;
  const rule = state.listeners.find(item => item.id === action.dataset.id);
  if (!rule) return;
  if (action.dataset.listenerAction === 'edit') return openListener(rule);
  if (action.dataset.listenerAction === 'delete' && !confirm(t('listener.deleteConfirm', { name: rule.name }))) return;
  action.disabled = true;
  try {
    if (action.dataset.listenerAction === 'delete') await api(`/api/listeners/${rule.id}`, { method: 'DELETE' });
    else await api(`/api/listeners/${rule.id}`, { method: 'PUT', body: JSON.stringify({ ...rule, enabled: !rule.enabled }) });
    await refresh();
  } catch (error) { notice(error.message, true); }
  finally { action.disabled = false; }
});
$('#addListenerBtn').addEventListener('click', () => openListener());
$('#configureBtn').addEventListener('click', () => openSettings());
$('#certificateBtn').addEventListener('click', () => openSettings(true));
$('#refreshBtn').addEventListener('click', refresh);
$('#coinFilter').addEventListener('change', renderConnections);
$('#connectionSearch').addEventListener('input', renderConnections);
$('#hideOffline').checked = hideOffline;
$('#hideOffline').addEventListener('change', () => {
  hideOffline = $('#hideOffline').checked;
  localStorage.setItem(HIDE_OFFLINE_KEY, hideOffline ? '1' : '0');
  if (state) renderMiners();
});
listenerForm.elements.mode.addEventListener('change', toggleUpstream);
listenerForm.elements.protocol.addEventListener('change', toggleProtocol);
listenerForm.addEventListener('submit', saveListener);
settingsForm.addEventListener('submit', saveSettings);
settingsForm.elements.certificateMode.addEventListener('change', toggleCertificate);
settingsForm.elements.routingMode.addEventListener('change', toggleRouting);
for (const coin of ['prl', 'qtc']) settingsForm.elements[`${coin}_enabled`].addEventListener('change', toggleRequired);

applyTheme();
applyLanguage();
const stream = new EventSource('/api/events');
stream.onopen = () => { streamLive = true; setSyncState('live'); };
stream.onmessage = event => { try { update(JSON.parse(event.data)); } catch (error) { notice(t('error.statusRead', { msg: error.message }), true); } };
stream.onerror = () => { streamLive = false; setSyncState('retry'); };
refresh();
setInterval(() => { if (!streamLive) refresh(); }, 5000);
requestAnimationFrame(function frame() {
  updateShareClocks();
  requestAnimationFrame(frame);
});
