#!/usr/bin/python
# coding: utf-8
# Author: Xetch Modify by Carroll

import json
import os
import re
import sys
import time

import public
from BTPanel import cache

pluginPath = "/www/server/panel/plugin/btp_frps"
frpsPath = pluginPath + '/bin/frps'
frpsCfgPath = pluginPath + '/conf/frps.toml'
os.chdir("/www/server/panel")
sys.path.append("class/")


class btp_frps_main():
    def check(self, get):
        if not os.path.isfile(frpsPath):
            return public.returnMsg(False, 'frps 未安装')

        success, failed = public.ExecShell(frpsPath + ' --version')
        if success.strip() == '':
            return public.returnMsg(False, 'frps 未安装或无执行权限')

        return public.returnMsg(True, {
            'version': success.strip(),
            'pid': self.__pid()
        })

    def install(self, get):
        taskName = 'frps'
        if self.__getTaskStatus(taskName) != 1:
            return public.returnMsg(False, '安装任务已在队列中')
        release = self.release()
        if release['result'] != 'success':
            return public.returnMsg(False, release['result'])
        cmd = "cd %s && /bin/bash install.sh download \"%s\"" % (pluginPath, release['url'])
        public.M('tasks').add('id, name, type, status, addtime, execstr', (None, '安装 [' + taskName + '-' + release['version'] + ']', 'execshell', '0', time.strftime('%Y-%m-%d %H:%M:%S'), cmd))
        cache.delete('install_task')
        public.writeFile('/tmp/panelTask.pl', 'True')
        public.WriteLog('TYPE_SETUP', 'PLUGIN_ADD', (taskName, release['version']))
        return public.returnMsg(True, '已将安装任务添加到队列')

    def upload(self, get):
        filename = pluginPath + '/temp/import.tar.gz'
        try:
            from flask import request
            file = request.files['import']
            if file.filename[-7:] == '.tar.gz' or file.filename[-4:] == '.zip':
                if file.filename[-4:] == '.zip':
                    filename = pluginPath + '/temp/import.zip'
                os.system('rm -rf ' + pluginPath + '/temp/import')
                os.system('mkdir -p ' + pluginPath + '/temp/import')
                os.system('mkdir -p ' + pluginPath + '/bin')
                os.system('rm -rf ' + filename)
                file.save(filename)
                import panelTask
                panelTask.bt_task()._unzip(filename, pluginPath + '/temp/import', '', '/dev/null')
                success, failed = public.ExecShell('find %s/temp/import -name frps' % pluginPath)
                if success.strip() != '':
                    os.system('mv -f %s %s' % (success.strip(), frpsPath))
                    os.system('chown root:root ' + frpsPath)
                    os.system('chmod +x ' + frpsPath)
                    os.system('rm -rf ' + pluginPath + '/temp/import')
                    os.system('rm -rf ' + filename)
                    if os.path.isfile(frpsPath):
                        return self.check(get)
        except:
            pass
        return public.returnMsg(False, '无效文件或未找到 frps')

    def upgrade(self, get):
        release = self.release()
        if release['result'] != 'success':
            return public.returnMsg(False, release['result'])
        return public.returnMsg(True, release)

    def verify(self, get):
        try:
            data = json.loads(get['json'])
            frpsCfg = public.ReadFile(frpsCfgPath, mode='r')
            frpsCfg = re.sub(r'# EXTRA-START(.*)# EXTRA-END\n', '', frpsCfg, flags=re.DOTALL)
            frpsCfgTmp = '# EXTRA-START\n' + data['extraCfg'] + '\n# EXTRA-END\n' + frpsCfg
            frpsCfgTmpPath = pluginPath + '/conf/frps_tmp.toml'
            public.WriteFile(frpsCfgTmpPath, frpsCfgTmp, mode='w+')
            success, failed = public.ExecShell(frpsPath + ' verify -c ' + frpsCfgTmpPath)
            os.system('rm -rf ' + frpsCfgTmpPath)
            if 'syntax is ok' not in success.strip():
                return public.returnMsg(False, success.strip())
            else:
                return public.returnMsg(True, '校验成功')
        except:
            return public.returnMsg(False, '请求错误，请刷新页面重试')

    def save(self, get):
        try:
            data = json.loads(get['json'])
            os.system('mkdir -p ' + pluginPath + '/conf')
            public.WriteFile(pluginPath + '/conf/config.json', get['json'], mode='w+')
            config_keys = {
                "bindAddr": "bindAddr",
                "bindPort": "bindPort",
                "kcpBindPort": "kcpBindPort",
                "authToken": "auth.token",

                # "tcpmuxHTTPConnectPort": "tcpmuxHTTPConnectPort",
                "proxyBindAddr": "proxyBindAddr",
                # "logTo": "log.to",
                "logLevel": "log.level",
                "disablePrintColor": "log.disablePrintColor",
                "logMaxDays": "log.maxDays",
                "heartbeatTimeout": "transport.heartbeatTimeout",
                "maxPoolCount": "transport.maxPoolCount",
                "maxPortsPerClient": "maxPortsPerClient",

                "dashboardAddr": "webServer.addr",
                "dashboardPort": "webServer.port",
                "dashboardUser": "webServer.user",
                "dashboardPwd": "webServer.password",
                # "assetsDir": "webServer.assetsDir",

                "subDomainHost": "subDomainHost",
                "vhostHTTPPort": "vhostHTTPPort",
                "vhostHTTPSPort": "vhostHTTPSPort",
                "vhostHTTPTimeout": "vhostHTTPTimeout",
                # "custom404Page": "custom404Page",

                # "allowPorts": "allowPorts",
            }
            config = ''
            if data['extraConfig'] != '':
                config = '# EXTRA-START\n' + data['extraConfig'] + '\n# EXTRA-END\n'
            for key in config_keys.keys():
                if str(data[key]) != '':
                    config_tpl = '%s = %s\n'
                    if type(data[key]) == str:
                        config_tpl = '%s = "%s"\n'
                    if type(data[key]) == bool:
                        data[key] = 'true' if data[key] else 'false'
                    config += config_tpl % (config_keys[key], data[key])
            config += 'log.to = "%s/temp/frps.log"\n' % pluginPath
            filename = pluginPath + '/conf/404.html'
            if not os.path.isfile(filename):
                public.WriteFile(filename, '', mode='w+')
            if data['enabledCustom404Page'] and os.path.getsize(filename) > 0:
                config += 'custom404Page = "%s"\n' % filename
            if type(data['allowPorts']) == list and len(data['allowPorts']) > 0:
                for port in data['allowPorts']:
                    if type(port) == int:
                        config += '\n[[allowPorts]]\nsingle = %s\n' % port
                    else:
                        ports = port.split('-')
                        config += '\n[[allowPorts]]\nstart = %s\nend = %s\n' % (ports[0], ports[1])
            public.WriteFile(frpsCfgPath, config, mode='w+')
            return public.returnMsg(True, '保存成功')
        except ValueError:
            return public.returnMsg(False, '请求错误，请刷新页面重试')

    def read(self, get):
        filename = pluginPath + '/conf/config.json'
        if os.path.isfile(filename):
            try:
                config = json.loads(public.ReadFile(filename, mode='r'))
                config['custom404Page'] = pluginPath + '/conf/404.html'
                return public.returnMsg(True, config)
            except ValueError:
                pass
        return public.returnMsg(False, '配置文件损坏或不存在')

    def release(self):
        """
        不知道为什么在这里用不了 public.httpGet
        """
        # result = public.httpGet('https://api.github.com/repos/fatedier/frp/releases/latest'); # 获取不到？
        # result = public.ExecShell('curl https://api.github.com/repos/fatedier/frp/releases/latest');
        # data = json.loads(result);
        # return resp.read().decode("utf8");
        filename = pluginPath + '/temp/release.json'
        result = 'success'
        version = ''
        url = ''
        remark = ''
        os.system('mkdir -p ' + pluginPath + '/temp')
        os.system('rm -rf ' + filename)
        os.system('wget -O ' + filename + ' https://api.github.com/repos/fatedier/frp/releases/latest')
        if not os.path.isfile(filename):
            result = '获取版本信息失败'
        else:
            try:
                data = json.loads(public.ReadFile(filename, mode='r'))
                version = data['tag_name'].strip()[1:]  # 版本号
                remark = data['body']  # 更新说明
                for item in data['assets']:
                    if item['name'].find('linux_amd64') != -1:
                        url = item['browser_download_url']  # 下载地址
                        break
            except ValueError:
                result = '文件解析失败，请稍后再试'
        os.system('rm -rf ' + filename)

        return {
            'version': version,
            'url': url,
            'remark': remark,
            'result': result
        }

    def start(self, get):
        pid = self.__pid()
        if pid != False:
            return public.returnMsg(True, 'frps 已开启，PID：%s' % pid)
        service = '''[Unit]
Description=Frp Server Service
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=%s -c %s

[Install]
WantedBy=multi-user.target''' % (frpsPath, frpsCfgPath)
        # 使用 systemd 管理自启动
        filename = '/etc/systemd/system/btp_frps.service'
        if os.path.isdir('/etc/systemd/system') and not os.path.isfile(filename):
            public.WriteFile(filename, service, mode='w+')
            os.system('chown root:root %s' % filename)
            os.system('chmod 755 %s' % filename)
        if os.path.isfile(filename):
            os.system('systemctl enable btp_frps')
            os.system('systemctl start btp_frps')
        else:
            os.system('nohup %s -c %s &' % (frpsPath, frpsCfgPath))
        time.sleep(1)
        pid = self.__pid()
        if pid != False:
            return public.returnMsg(True, '开启成功，PID：%s' % pid)
        return public.returnMsg(False, '开启失败')

    def stop(self, get):
        pid = self.__pid()
        if pid == False:
            return public.returnMsg(True, 'frps 尚未运行')
        filename = '/etc/systemd/system/btp_frps.service'
        if os.path.isfile(filename):
            os.system('systemctl stop btp_frps')
            os.system('systemctl disable btp_frps')
            os.system('rm -rf %s' % filename)
        else:
            os.system('kill -9 %s' % pid)
        return public.returnMsg(True, '关闭成功')

    def restart(self, get):
        if os.path.isfile('/etc/systemd/system/btp_frps.service'):
            os.system('systemctl restart btp_frps')
        else:
            pid = self.__pid()
            if pid != False:
                os.system('kill -9 %s' % pid)
            os.system('nohup %s -c %s &' % (frpsPath, frpsCfgPath))
            import time
            time.sleep(1)
        return public.returnMsg(True, '重启成功')

    def logs(self, get):
        filename = pluginPath + '/temp/frps.log'
        if os.path.isfile(filename):
            # 宝塔封装的 public.ReadFile 不适合读取大文件
            success, failed = public.ExecShell('tail -n 1000 %s' % filename)
            if success.strip() != '':
                return public.returnMsg(True, success.strip())
        return public.returnMsg(True, '暂无运行日志')

    def clear(self, get):
        filename = pluginPath + '/temp/frps.log'
        os.system('cat /dev/null > %s' % filename)
        return public.returnMsg(True, '清理成功')

    def __pid(self):
        success, failed = public.ExecShell('ps -ef | grep %s | grep -v grep | awk \'{print $2}\' | head -n 1' % frpsPath)
        if success.strip() == '':
            return False
        return success.strip()

    def __getTaskStatus(self, taskName):
        result = public.M('tasks').where("status!=?", ('1',)).field('status,name').select()
        status = 1
        for task in result:
            name = public.getStrBetween('[', ']', task['name'])
            if not name: continue;
            if name.split('-')[0] == taskName:
                status = int(task['status'])
        return status

# print(btp_frps_main().install({}));
