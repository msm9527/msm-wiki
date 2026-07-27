# CF自动优选

自动优选DNS服务-规则管理-重定向中的CF IP

## 脚本配置

[cfst-qinglong.zip](https://github.com/user-attachments/files/30294691/cfst-qinglong.zip)
以青龙面板为例，解压后放入青龙面板的scripts文件夹
编辑update_mosdns_rewrite_pt_domain.py
```python
# ==================== 固定配置 ====================
MSM_BASE_URL = "http://你的MSM内网ip:7777/api/v1"
MSM_API_TOKEN = "MSM中创建管理员权限token"
```
在青龙面板中安装好所需依赖
```python
import csv
import ipaddress
import subprocess
import time
from pathlib import Path
import requests
```
<img width="522" height="494" alt="image" src="https://github.com/user-attachments/assets/6e1a4cdd-a1b1-4aa4-8995-654a13289265" />
设置定时任务
<img width="514" height="471" alt="image" src="https://github.com/user-attachments/assets/e7e9394a-433e-41d4-bbf7-0f8e657c79bc" />
图中为4小时一次，自行修改合适的时间间隔


## MSM配置

初次使用需要将重定向规则中，需要CF优选的规则的ip，改成best_ip.txt中的ip
