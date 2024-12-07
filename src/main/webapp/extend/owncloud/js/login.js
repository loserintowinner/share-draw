document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); // 阻止表单的默认提交行为
    var loginButton = document.getElementById('loginButton');
    loginButton.disabled = true;


    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;


    var emailRegex = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    if (!emailRegex.test(email)) {
        document.getElementById('message').textContent = '邮箱格式不正确';
    } else {
        var data = {
            email: email,
            password: password
        };

        // 将数据转换为JSON字符串
        var jsonData = JSON.stringify(data);

        // 创建一个新的XMLHttpRequest对象
        var xhr = new XMLHttpRequest();

        // 设置请求的URL、方法、以及头部信息
        xhr.open('POST', window.opener.DRAWIO_SERVER_URL + 'owncloud/login', true); // 注意：这里我假设端点是/login
        xhr.setRequestHeader('Content-Type', 'application/json');

        // 发送请求
        xhr.send(jsonData);

        // 设置事件监听器来处理响应
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    console.log('Login successful:', xhr.responseText);
                    if (window.opener != null) {
                        window.opener.postMessage(xhr.responseText, '*')
                    }

                } else if(xhr.status === 400){
                    document.getElementById('message').textContent = '密码不正确';
                } else{
                    document.getElementById('message').textContent = '服务异常';
                }
                loginButton.disabled = false;
            }
        };

        // 也可以设置onerror事件监听器来处理网络错误
        xhr.onerror = function () {
            console.error('Network Error');
            loginButton.disabled = false;
        };
    }

});
