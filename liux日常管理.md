## 日常管理

  sudo systemctl status yichen-translate   # 查看状态
  sudo systemctl stop yichen-translate     # 停止
  sudo systemctl start yichen-translate    # 启动
  sudo systemctl restart yichen-translate  # 重启
  journalctl -u yichen-translate -f        # 实时日志

## 开机启动

  # 1. 拷贝 service 文件到 systemd 目录
  sudo cp /data/usershare/app/Yichen-translation/yichen-translate.service /etc/systemd/system/

  # 2. 重载 systemd 配置
  sudo systemctl daemon-reload

  # 3. 启用开机自启
  sudo systemctl enable yichen-translate

  # 4. 立即启动（不重启也能跑）
  sudo systemctl start yichen-translate

  # 验证是否已启用
  sudo systemctl is-enabled yichen-translate

  # 取消开机自启
  sudo systemctl disable yichen-translate

## 后台运行

  ### nohup（简单，关终端后仍在运行）
  nohup node index.js > output.log 2>&1 &
  # 查看后台进程
  jobs -l
  # 或
  ps aux | grep node

  ### screen（可断线重连）
  screen -S yichen          # 创建名为 yichen 的会话
  # 在会话中启动服务
  # Ctrl+A, D 断开（服务继续跑）
  screen -r yichen           # 重新连接
  screen -ls                 # 查看所有会话
  screen -S yichen -X quit   # 关闭会话

  ### tmux（可断线重连，功能更强）
  tmux new -s yichen         # 创建名为 yichen 的会话
  # 在会话中启动服务
  # Ctrl+B, D 断开（服务继续跑）
  tmux attach -t yichen      # 重新连接
  tmux ls                    # 查看所有会话
  tmux kill-session -t yichen # 关闭会话

  ### 直接后台运行（仅当前终端有效）
  node index.js &            # 后台运行，关终端就停
  fg                         # 切回前台
  Ctrl+Z → bg                # 暂停后放入后台继续跑

