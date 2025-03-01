new Vue({
    el: "#btp_frps",
    watch: {
        current: function (current) {
            const t = this;
            if (t.timer !== null) {
                clearTimeout(t.timer);
            }
            if (current === 'about') {
                t.about.sort(() => {
                    return Math.random() - 0.5;
                });
            }
            if (current === 'status') {
                t.getLogs();
            }
            t.config = $.extend(true, {}, t.configBak);
        }
    },
    data: {
        version: "加载中 ...",
        menu: [
            {
                name: "通用设置",
                value: "common"
            },
            {
                name: "高级设置",
                value: "advanced"
            },
            {
                name: "仪表盘设置",
                value: "dashboard"
            },
            {
                name: "虚拟主机",
                value: "vhost"
            },
            {
                name: "端口白名单",
                value: "ports"
            },
            {
                name: "额外设置",
                value: "extra"
            },
            {
                name: "运行状态",
                value: "status"
            },
            {
                name: "关于",
                value: "about"
            }
        ],
        about: [
            {
                name: "宝塔面板",
                url: "https://www.bt.cn/"
            },
            {
                name: "frp",
                url: "https://github.com/fatedier/frp"
            },
            {
                name: "Vue.js",
                url: "https://cn.vuejs.org/"
            },
            {
                name: "axios",
                url: "https://github.com/axios/axios"
            },
            {
                name: "Python",
                url: "https://www.python.org/"
            },
            {
                name: "Bootstrap",
                url: "https://getbootstrap.com/"
            },
            {
                name: "layer",
                url: "https://layer.layui.com/"
            },
            {
                name: "Ace",
                url: "https://ace.c9.io/"
            },
            {
                name: "CodeMirror",
                url: "https://codemirror.net/"
            }
        ],
        current: "common",
        init: false,
        installed: false,
        started: false,
        config: {
            bindAddr: '0.0.0.0',
            bindPort: 7000,
            bindUdpPort: 7001,
            kcpBindPort: 7000,
            token: '',

            proxyBindAddr: '',
            logFile: '',
            logLevel: 'info',
            disableLogColor: true,
            logMaxDays: '',
            heartbeatTimeout: '',
            maxPoolCount: '',
            maxPortsPerClient: '',
            tcpMux: true,

            dashboardAddr: '',
            dashboardPort: '',
            dashboardUser: '',
            dashboardPwd: '',
            // assetsDir: '',

            subdomainHost: '',
            vhostHttpPort: '',
            vhostHttpsPort: '',
            vhostHttpTimeout: '',
            // custom404Page: '/www/server/panel/plugin/btp_frps/conf/404.html',
            custom404Page: '',
            enabledCustom404Page: false,

            allowPorts: [],
            extraConfig: ''
        },
        configBak: null,
        logs: '',
        timer: null,
        createdAt: (new Date()).getTime().toString()
    },
    methods: {
        change(value) {
            this.current = value;
        },
        showHidePwd(event) {
            const t = event.currentTarget;
            const className = ['glyphicon-eye-close', 'glyphicon-eye-open'];
            const hasClass = t.classList.contains('glyphicon-eye-close');
            t.parentElement.firstElementChild.type = hasClass ? 'text' : 'password';
            t.classList.replace(className[+!hasClass], className[+hasClass]);
        },
        compareVersion(version1, version2) {
            version1 = version1 || '';
            version2 = version2 || '';
            if (version1 === '' || version2 === '') {
                throw new Error('版本号不能为空');
            }
            const arr1 = version1.split('.');
            const arr2 = version2.split('.');
            const length1 = arr1.length;
            const length2 = arr2.length;
            let minlength = Math.min(length1, length2);
            let i = 0;
            for (i; i < minlength; i++) {
                let a = parseInt(arr1[i]) || 0;
                let b = parseInt(arr2[i]) || 0;
                let diff = a - b;
                if (diff !== 0) {
                    return diff > 0 ? 1 : -1;
                }
            }
            if (length1 === length2) {
                return 0;
            } else if (length1 > length2) {
                for (let j = i; j < length1; j++) {
                    if (parseInt(arr1[j]) !== 0) {
                        return 1;
                    }
                }
                return 0;
            } else {
                for (let j = i; j < length2; j++) {
                    if (parseInt(arr2[j]) !== 0) {
                        return -1;
                    }
                }
                return 0;
            }
        },
        backup() {
            this.configBak = $.extend(true, {}, this.config);
            return this;
        },
        install() {
            const t = this;
            const msgId = layer.msg("正在提交任务，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('install').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    bt.pub.get_task_count();
                    if (t.installed && t.started) {
                        layer.alert('提交成功，更新完成后请手动重启 frps', {
                            icon: 1
                        });
                    } else {
                        layer.msg(response.data.msg, {icon: response.data.status ? 1 : 2});
                    }
                    return;
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        upgrade() {
            const t = this;
            const msgId = layer.msg("正在获取 frps 版本信息，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('upgrade').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        if (response.data.msg.version !== t.version) {
                            return layer.confirm('frps ' + response.data.msg.version + ' 更新说明：<pre>' + response.data.msg.remark + '</pre>如需更新请点击「确定」按钮', (index) => {
                                layer.close(index);
                                t.install();
                            });
                        }
                        return layer.msg('已安装最新版本 frps', {icon: 1});
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        addPort() {
            const t = this;
            const name = '__btp_frps_' + (new Date()).getTime();
            layer.open({
                type: 1,
                title: '添加端口',
                closeBtn: 2,
                area: '450px',
                btn: ['确定', '取消'],
                content: t.$refs.addPort.innerHTML.replace('__VALUE__', name),
                yes(index, layers) {
                    let port = document.querySelector(`input[name='${name}']`).value.replace(/\s+/g, '');
                    if (port === '') {
                        layer.msg('端口不能为空，请重新输入', {icon: 2});
                        return false;
                    }
                    let ports = port.match(/^(\d+)(-(\d+))?$/);
                    if (ports === null) {
                        layer.msg('端口格式错误，请重新输入', {icon: 2});
                        return false;
                    }
                    let beginPort, endPort;
                    if (ports[2] !== undefined) {
                        beginPort = ports[1];
                        endPort = ports[3];
                    } else {
                        beginPort = endPort = port;
                    }
                    beginPort = parseInt(beginPort);
                    endPort = parseInt(endPort);
                    if (beginPort < 1 || beginPort > 65535 || endPort < 1 || endPort > 65535) {
                        layer.msg('端口范围为 1 至 65535，请重新输入', {icon: 2});
                        return false;
                    }
                    if (beginPort > endPort) {
                        layer.msg('起始端口不能大于终止端口，请重新输入', {icon: 2});
                        return false;
                    }
                    if (beginPort === endPort) {
                        port = beginPort;
                    }
                    t.config.allowPorts.push(port);
                    layer.close(index);
                }
            });
        },
        removePort(index) {
            this.config.allowPorts.splice(index, 1);
        },
        saveExtra() {
            const t = this;
            if ($.trim(t.config.extraConfig) === '' && t.configBak.extraConfig === '') return layer.msg('内容为空，无需保存！', {icon: 0});
            if (t.config.extraConfig === t.configBak.extraConfig) return layer.msg('内容未更改，无需保存！', {icon: 0});
            let comp_rst = -1;
            try {
                comp_rst = t.compareVersion(t.version, "0.37.0");
            } catch (e) {
            }
            if (comp_rst === -1) {
                return layer.confirm('检测到程序版本<0.37.0无法进行校验，确定要保存配置吗？【<span style="color: red">!! 请自行核对配置内容 !!</span>】', {
                    icon: 0,
                    title: '提示'
                }, (index) => {
                    layer.close(index);
                    t.save();
                });
            }
            const msgId = layer.msg("正在校验配置，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('verify', {extraCfg: t.config.extraConfig}).then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        return layer.confirm('配置校验成功，是否保存配置？', {icon: 1}, (index) => {
                            layer.close(index);
                            t.save();
                        });
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                });
                console.error(error);
            });
        },
        clearExtra() {
            if (this.configBak.extraConfig !== '') {
                return layer.confirm('确定要清空配置吗？', {icon: 0, title: '提示'}, (index) => {
                    layer.close(index);
                    this.config.extraConfig = '';
                    this.save();
                });
            }
            this.config.extraConfig = '';
        },
        save(init) {
            const t = this;
            const msgId = layer.msg(init === true ? "正在初始化配置，请稍等 ..." : "正在保存配置，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.backup().api('save', t.config).then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        if (init === true) {
                            t.read();
                            return layer.msg('初始化配置成功', {icon: 1});
                        }
                        if (!t.started) {
                            return layer.msg('保存成功', {icon: 1});
                        }
                        return layer.confirm('保存成功！配置信息将在重启 frps 后生效', {icon: 1, btn: ['重启', '关闭']}, (index) => {
                            layer.close(index);
                            t.restart();
                        });
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                });
                console.error(error);
            });
        },
        check() {
            const t = this;
            const msgId = layer.msg("正在获取 frps 状态，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('check').then((response) => {
                layer.close(msgId);
                t.installed = response.status === 200 && response.data.status === true;
                if (t.installed) {
                    t.version = response.data.msg.version;
                    t.started = response.data.msg.pid !== false;

                    let comp_rst = -1;
                    try {
                        comp_rst = t.compareVersion(t.version, "0.52.0");
                    } catch (e) {
                    }
                    if (!t.started && comp_rst !== -1) {
                        layer.alert('INI 配置版未来版本可能随时废弃，若启动失败，请降级程序版本或切换TOML 配置版！', {icon: 0, title: '重要提示'});
                    }
                }
                t.read();
            }).catch((error) => {
                layer.close(msgId);
                t.read();
                console.error(error);
            });
        },
        read() {
            const t = this;
            const msgId = layer.msg("正在读取 frps 配置信息，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('read').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && response.data.status === true) {
                    Object.keys(t.config).map((key) => {
                        if (response.data.msg[key] !== undefined) {
                            t.config[key] = response.data.msg[key];
                        }
                    });
                    t.backup();
                } else {
                    t.save(true);
                }
            }).catch((error) => {
                layer.close(msgId);
                console.error(error);
            });
        },
        start() {
            const t = this;
            const msgId = layer.msg("正在开启 frps，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('start').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        t.started = true;
                        return layer.msg('开启成功', {icon: 1});
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        stop() {
            const t = this;
            const msgId = layer.msg("正在关闭 frps，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('stop').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        t.started = false;
                        return layer.msg('关闭成功', {icon: 1});
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        restart() {
            const t = this;
            const msgId = layer.msg("正在重启 frps，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('restart').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        t.started = true;
                        return layer.msg('重启成功', {icon: 1});
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        getLogs() {
            const t = this;
            const $el = document.querySelector('#btp_frps');
            if ($el && $el.getAttribute('data-created-at') === t.createdAt) {
                t.api('logs').then((response) => {
                    t.timer = setTimeout(t.getLogs, 5000);
                    if (response.status === 200 && typeof response.data === 'object') {
                        t.logs = response.data.msg;
                        return;
                    }
                    t.logs = '暂无日志';
                }).catch((error) => {
                    t.timer = setTimeout(t.getLogs, 3000);
                    t.logs = '接口请求失败';
                    console.error(error);
                });
            }
        },
        clearLogs() {
            const t = this;
            const msgId = layer.msg("正在清理 frps 运行日志，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            t.api('clear').then((response) => {
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        t.logs = '暂无运行日志';
                        return layer.msg('清理成功', {icon: 1});
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                layer.close(msgId);
                layer.alert('接口请求失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        custom404Page() {
            // if (!window._OnlineEditFile) {
            //     let func = window.OnlineEditFile.toString();
            //     func = func.replace(/OnlineEditFile\((.*)\)/g, '_OnlineEditFile($1)');
            //     func = func.replace(/encodeURIComponent/g, '');
            //     let funcBody = func.match(/{([\s\S]+)}/)[1];
            //     funcBody = funcBody.substr(0, funcBody.length - 6) + "if(cb&&typeof cb==='function'){cb()}\n" + funcBody.substr(-6);
            //     window._OnlineEditFile = new Function(func.match(/\(([^)]+)\)/)[1] + ', cb', funcBody);
            // }
            // window._OnlineEditFile(0, this.config.custom404Page, function () {
            //     const codeMirrorDiv = document.getElementsByClassName("CodeMirror").item(0);
            //     codeMirrorDiv.style.top = '10px';
            //     codeMirrorDiv.style.height = (parseFloat(codeMirrorDiv.style.height) - 20) + 'px';
            // });
            if (!window.ace) {
                window.__btpFrpsMsgId = layer.msg("正在加载编辑器，请稍等 ...", {
                    icon: 16,
                    time: 0,
                    shade: 0.3
                });
            }
            this.openWithAce();
        },
        openWithAce() {
            const t = this;
            const $doc = document;
            switch (true) {
                case !window.ace:
                    const $ace = $doc.createElement("script");
                    $ace.setAttribute("type", "text/javascript");
                    $ace.setAttribute("src", "/static/editor/ace.js");
                    $ace.addEventListener("load", function () {
                        $ace.remove();
                        const $aceExtra = $doc.createElement("script");
                        $aceExtra.setAttribute("type", "text/javascript");
                        $aceExtra.setAttribute("src", "/static/editor/ext-language_tools.js");
                        $aceExtra.addEventListener("load", function () {
                            $aceExtra.remove();
                            t.openWithAce();
                        });
                        $doc.head.append($aceExtra);
                    });
                    $doc.head.append($ace);
                    break;

                default:
                    layer.close(window.__btpFrpsMsgId);
                    window.OnlineEditFile(0, t.config.custom404Page);
            }
        },
        uploadFile() {
            const t = this;
            const params = new FormData();
            const msgId = layer.msg("正在上传文件，请稍等 ...", {
                icon: 16,
                time: 0,
                shade: 0.3
            });
            params.append('import', t.$refs.import.files[0]);
            axios.post('/plugin?action=a&name=btp_frps&s=upload', params, {headers: {'Content-Type': 'multipart/form-data'}}).then((response) => {
                t.$refs.import.value = null;
                layer.close(msgId);
                if (response.status === 200 && typeof response.data === 'object') {
                    if (response.data.status) {
                        t.started = response.data.msg.pid !== false;
                        if (t.started) {
                            layer.confirm('更新成功！重启 frps 后将以新版本运行', {icon: 1, btn: ['重启', '关闭']}, (index) => {
                                layer.close(index);
                                t.restart();
                            });
                        } else {
                            layer.msg(t.installed ? '更新成功' : '安装成功', {icon: 1});
                        }
                        t.version = response.data.msg.version;
                        t.installed = true;
                        return;
                    }
                    return layer.alert(response.data.msg, {
                        icon: 2
                    });
                }
                layer.alert('发生未知错误，代码：' + response.status, {
                    icon: 2
                });
            }).catch((error) => {
                t.$refs.import.value = null;
                layer.close(msgId);
                layer.alert('文件上传失败', {
                    icon: 2
                })
                console.error(error);
            });
        },
        api(action, data) {
            if (!data) {
                return axios.get('/plugin?action=a&name=btp_frps&s=' + action);
            }
            return axios.post('/plugin?action=a&name=btp_frps&s=' + action, 'json=' + encodeURIComponent(JSON.stringify(data)));
        }
    },
    created() {
        this.check();
    },
    mounted() {
        const t = this;
        t.$el.setAttribute('data-created-at', t.createdAt);
        t.init = true;
        t.backup();
    }
})