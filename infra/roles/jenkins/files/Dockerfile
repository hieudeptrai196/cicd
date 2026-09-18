# Image Jenkins tùy chỉnh: thêm Docker CLI (để build/push image trong pipeline)
# và Ansible (để pipeline tự gọi ansible-playbook ở bước CD) ngay bên trong container.
FROM jenkins/jenkins:lts-jdk17
USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg python3 python3-pip && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
        > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
    pip3 install --no-cache-dir --break-system-packages ansible-core && \
    apt-get purge -y curl gnupg && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

USER jenkins
