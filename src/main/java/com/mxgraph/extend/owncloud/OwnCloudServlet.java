package com.mxgraph.extend.owncloud;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mxgraph.extend.EnvironmentVariableListener;
import com.mxgraph.extend.MultiReadHttpServletRequest;
import com.mxgraph.extend.Utils;
import com.mxgraph.online.AbsAuth;

import javax.net.ssl.HttpsURLConnection;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class OwnCloudServlet extends HttpServlet {

    public static String CONFIG_PATH = "owncloud.properties";

    public static String OWNCLOUD_SERVICE_URL = null;

    public static String ADMIN_EMAIL = null;

    public static String ADMIN_PASSWORD = null;

    public static String TOKEN = null;

    public static String PUBLIC_REPO_ID = null;

    static {
        // 加载OwnCloud自有云配置信息
        try {
            Properties properties = Utils.getProperties(CONFIG_PATH, EnvironmentVariableListener.servletContext);
            OWNCLOUD_SERVICE_URL = properties.getProperty("ownCloudServiceUrl");
            ADMIN_EMAIL = properties.getProperty("adminEmail");
            ADMIN_PASSWORD = properties.getProperty("adminPassword");

            TOKEN = getToken(OWNCLOUD_SERVICE_URL, ADMIN_EMAIL, ADMIN_PASSWORD);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) {
        String url = request.getRequestURI().replace("//", "/");
//        System.out.println(url);
        if (url.endsWith("/owncloud/login")) {
            doLogin(request, response);
        }
    }

    public void doLogin(HttpServletRequest request, HttpServletResponse response) {
        byte[] body = ((MultiReadHttpServletRequest) request).getBody();
        Gson gson = new Gson();
        JsonElement jsonElement = gson.fromJson(new String(body, StandardCharsets.UTF_8), JsonElement.class);
        if (jsonElement.isJsonObject()) {
            String email = jsonElement.getAsJsonObject().get("email").getAsString();
            String password = jsonElement.getAsJsonObject().get("password").getAsString();

            if (!checkUserExist(email)) {
                addUser(email, password);
            }
            String token = getToken(OWNCLOUD_SERVICE_URL, email, password);
            if (token != null) {
//                System.out.println(token);
                response.setStatus(HttpServletResponse.SC_OK);

                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("token", token);

                try {
                    PrintWriter out = response.getWriter();
                    out.write(jsonObject.toString());
                    out.flush();
                    out.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            }
        } else {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    public boolean checkUserExist(String email) {
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(OWNCLOUD_SERVICE_URL + "/api/v2.1/admin/users/" + email);
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            httpConn.setRequestProperty("Authorization", "Token " + TOKEN);
            httpConn.setRequestProperty("Accept", "application/json; charset=utf-8; indent=4");

            if (httpConn.getResponseCode() == HttpServletResponse.SC_OK) {
                return true;
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }

        return false;
    }

    public void addUser(String email, String password) {
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(OWNCLOUD_SERVICE_URL + "/api/v2.1/admin/users/");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("POST");
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            httpConn.setRequestProperty("Authorization", "Token " + TOKEN);
            httpConn.setRequestProperty("Accept", "application/json; charset=utf-8; indent=4");
            httpConn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            httpConn.setDoOutput(true);
            OutputStreamWriter writer = new OutputStreamWriter(httpConn.getOutputStream());
            writer.write("email=" + email + "&password=" + password);
            writer.flush();
            writer.close();

            BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
            String inputLine;
            StringBuffer sb = new StringBuffer();
            while ((inputLine = in.readLine()) != null) {
                sb.append(inputLine);
            }
            in.close();
            String res = sb.toString();
//            System.out.println(res);
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }


    }

    public static String getToken(String serviceUrl, String email, String password) {
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(serviceUrl + "/api2/auth-token/");
            httpConn = (HttpURLConnection) url.openConnection();

            httpConn.setRequestMethod("POST");
            httpConn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            httpConn.setDoOutput(true);
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            OutputStreamWriter writer = new OutputStreamWriter(httpConn.getOutputStream());
            writer.write("username=" + URLEncoder.encode(email, "UTF-8") + "&password=" + URLEncoder.encode(password, "UTF-8"));
            writer.flush();
            writer.close();
            httpConn.getOutputStream().close();


            BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
            String inputLine;
            StringBuffer sb = new StringBuffer();
            while ((inputLine = in.readLine()) != null) {
                sb.append(inputLine);
            }
            in.close();
            String res = sb.toString();

            Gson gson = new Gson();
            JsonElement jsonElement = gson.fromJson(res, JsonElement.class);

            if (jsonElement.isJsonObject()) {
                JsonElement token = jsonElement.getAsJsonObject().get("token");
                if (token != null) {
                    return token.getAsString();
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }
        return null;
    }

    // 保存文件并共享
    public String doSaveAndShare(String repositoryId, String path, String data, String filename) throws IOException {
        String uploadLink = createUploadLink(repositoryId, path);
        uploadFile(uploadLink, path, filename, data);
        String token = createShareLink(repositoryId, path, filename);

        return token;
    }

    public String createShareLink(String repoId, String path, String filename) {
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(OWNCLOUD_SERVICE_URL + "/api/v2.1/share-links/");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("POST");
            httpConn.setDoOutput(true);
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);
            httpConn.setRequestProperty("Authorization", "Token " + TOKEN);

            // 设置请求头
            httpConn.setRequestProperty("Content-Type", "multipart/form-data; boundary=----WebKitFormBoundaryBnZQnawjNzv80xle");

            // 构建表单数据
            String boundary = "----WebKitFormBoundaryBnZQnawjNzv80xle";
            StringBuilder sb = new StringBuilder();
            sb.append("--").append(boundary).append("\r\n");
            sb.append("Content-Disposition: form-data; name=\"repo_id\";\r\n\r\n");
            sb.append(repoId).append("\r\n");
            sb.append("--").append(boundary).append("\r\n");
            sb.append("Content-Disposition: form-data; name=\"path\";\r\n\r\n");
            sb.append(path + filename).append("\r\n");
            sb.append("--").append(boundary).append("--\r\n");
            // 发送请求
            OutputStream writer = httpConn.getOutputStream();
            writer.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            writer.flush();
            writer.close();

            // 读取响应
            InputStream in = null;
            if (httpConn.getResponseCode() == HttpURLConnection.HTTP_OK) { // 200 OK
                in = httpConn.getInputStream();
            } else {
                in = httpConn.getErrorStream();
            }

            BufferedReader rd = new BufferedReader(new InputStreamReader(in));
            String line;
            StringBuilder response = new StringBuilder();
            while ((line = rd.readLine()) != null) {
                response.append(line);
            }
            rd.close();
            String res = response.toString();
            System.out.println(res);

            Gson gson = new Gson();
            JsonElement jsonElement = gson.fromJson(res, JsonElement.class);

            if (jsonElement.isJsonObject()) {
                JsonElement token = jsonElement.getAsJsonObject().get("token");
                if (token != null) {
                    return token.getAsString();
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }
        return null;
    }

    public String getShareRepositoryId() {
        if (PUBLIC_REPO_ID != null) {
            return PUBLIC_REPO_ID;
        }

        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(OWNCLOUD_SERVICE_URL + "/api/v2.1/repos/?type=public");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);
            httpConn.setRequestProperty("Authorization", "Token " + TOKEN);

            if (httpConn.getResponseCode() == HttpServletResponse.SC_OK) {
                BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
                String inputLine;
                StringBuffer sb = new StringBuffer();
                while ((inputLine = in.readLine()) != null) {
                    sb.append(inputLine);
                }
                in.close();
                String res = sb.toString();

                Gson gson = new Gson();
                JsonElement jsonElement = gson.fromJson(res, JsonElement.class);

                if (jsonElement.isJsonObject()) {
                    JsonElement repos = jsonElement.getAsJsonObject().get("repos");
                    JsonElement repo = repos.getAsJsonArray().get(0);
                    JsonElement repo_id = repo.getAsJsonObject().get("repo_id");
                    PUBLIC_REPO_ID = repo_id.getAsString();
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }

        return PUBLIC_REPO_ID;
    }

    public String createUploadLink(String repoId, String path) {
        HttpURLConnection httpConn = null;
        try {
            URL url = new URL(OWNCLOUD_SERVICE_URL + "/api2/repos/" + repoId + "/upload-link/?p=" + path);
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");

            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);
            httpConn.setRequestProperty("Authorization", "Token " + TOKEN);


            BufferedReader in = new BufferedReader(new InputStreamReader(httpConn.getInputStream(), "UTF-8"));
            String inputLine;
            StringBuffer sb = new StringBuffer();
            while ((inputLine = in.readLine()) != null) {
                sb.append(inputLine);
            }
            in.close();
            String res = sb.toString();

            return res.substring(1, res.length() - 1);
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }

        return null;
    }

    public void uploadFile(String uploadLink, String path, String filename, String data) {
        try {
            URL url = new URL(uploadLink);
            HttpURLConnection httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("POST");
            httpConn.setDoOutput(true);
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            // 设置请求头
            httpConn.setRequestProperty("Content-Type", "multipart/form-data; boundary=----WebKitFormBoundaryBnZQnawjNzv80xle");

            // 构建表单数据
            String boundary = "----WebKitFormBoundaryBnZQnawjNzv80xle";
            StringBuilder sb = new StringBuilder();
            sb.append("--").append(boundary).append("\r\n");
            sb.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(filename).append("\"\r\n");
            sb.append("Content-Type: application/octet-stream\r\n\r\n");
            sb.append(data).append("\r\n");
            sb.append("--").append(boundary).append("\r\n");
            sb.append("Content-Disposition: form-data; name=\"parent_dir\";\r\n\r\n");
            sb.append(path).append("\r\n");
            sb.append("--").append(boundary).append("\r\n");
            sb.append("Content-Disposition: form-data; name=\"replace\";\r\n\r\n");
            sb.append("1").append("\r\n");
            sb.append("--").append(boundary).append("--\r\n");
            // 发送请求
            OutputStream writer = httpConn.getOutputStream();
            writer.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            writer.flush();
            writer.close();

            // 读取响应
            InputStream in = null;
            if (httpConn.getResponseCode() == HttpURLConnection.HTTP_OK) { // 200 OK
                in = httpConn.getInputStream();
            } else {
                in = httpConn.getErrorStream();
            }

            BufferedReader rd = new BufferedReader(new InputStreamReader(in));
            String line;
            StringBuilder response = new StringBuilder();
            while ((line = rd.readLine()) != null) {
                response.append(line);
            }
            rd.close();

            // 输出响应
            System.out.println(response.toString());


        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // 通过proxyServlet调用
    public static String loadFile(String chartId) {
        HttpURLConnection httpConn = null;
        try {

            URL url = new URL(OWNCLOUD_SERVICE_URL + "/f/" + chartId + "/?dl=1");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

            int responseCode = httpConn.getResponseCode();
            if (responseCode == HttpServletResponse.SC_MOVED_PERMANENTLY
                    || responseCode == HttpServletResponse.SC_MOVED_TEMPORARILY) {
                // 获取重定向的URL
                String redirectUrl = httpConn.getHeaderField("Location");
                URL newUrl = new URL(redirectUrl);

                httpConn.disconnect();
                httpConn = (HttpURLConnection) newUrl.openConnection();
                httpConn.setRequestMethod("GET");
                SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);
            }

            // 读取响应内容到byte数组中
            InputStream in = httpConn.getInputStream();
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();

            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, bytesRead);
            }
            byte[] responseBytes = byteArrayOutputStream.toByteArray();

            in.close();
            byteArrayOutputStream.close();

            return new String(responseBytes, StandardCharsets.UTF_8);

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }
        return null;
    }
}
