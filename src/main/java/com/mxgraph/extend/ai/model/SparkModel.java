package com.mxgraph.extend.ai.model;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mxgraph.extend.EnvironmentVariableListener;
import com.mxgraph.extend.MultiReadHttpServletRequest;
import com.mxgraph.extend.Utils;
import com.mxgraph.extend.ai.GenerateModel;
import com.mxgraph.extend.owncloud.SkipSSLVerification;
import org.apache.commons.lang3.StringEscapeUtils;

import javax.net.ssl.HttpsURLConnection;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.UUID;

public class SparkModel implements GenerateModel {

    public static String CONFIG_PATH = "ai.properties";

    public static String prefix = "spark.";

    public static String hostUrl = null;

    public static String APIKey = null;

    public static String APISecret = null;

    static {
        try {
            Properties properties = Utils.getProperties(CONFIG_PATH, EnvironmentVariableListener.servletContext);
            hostUrl = properties.getProperty(prefix + "hostUrl");
            APIKey = properties.getProperty(prefix + "APIKey");
            APISecret = properties.getProperty(prefix + "APISecret");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public String generate(String text) throws IOException, ServletException {
        // 设置URL
        URL url = new URL(hostUrl);
        // 打开连接
        HttpURLConnection httpConn = (HttpURLConnection) url.openConnection();

        // 设置请求方法
        httpConn.setRequestMethod("POST");
        httpConn.setDoOutput(true);
        SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

        // 设置请求头
        httpConn.setRequestProperty("Authorization", "Bearer " + APIKey + ":" + APISecret);
        httpConn.setRequestProperty("Content-Type", "application/json");


        // 设置请求体（JSON数据）
        String jsonInputString = createJsonInput(text);
        System.out.println(jsonInputString);


        // 发送POST输出
        OutputStream writer = httpConn.getOutputStream();
        writer.write(jsonInputString.getBytes("utf-8"));
        writer.flush();
        writer.close();

        int responseCode = httpConn.getResponseCode();


        InputStream in = null;


        if (responseCode == HttpURLConnection.HTTP_OK) { // 200 OK
            in = httpConn.getInputStream();
        } else {
            // 对于非200的响应码，可以通过getErrorStream()获取错误详情（如果有的话）
            in = httpConn.getErrorStream();
        }

        // 读取响应
        BufferedReader bufReader = new BufferedReader(new InputStreamReader(in, "UTF-8"));
        String inputLine;
        StringBuffer sb = new StringBuffer();
        while ((inputLine = bufReader.readLine()) != null) {
            sb.append(inputLine);
        }
        String res = sb.toString();

        in.close();

        return res;
    }

    public static String normalPrefix = "#请用mermaid语法帮我绘制以下所述\n";

    private String createJsonInput(String text) {
        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("model", "general");
        jsonObject.addProperty("temperature", 0.1);
        jsonObject.addProperty("top_k", 1);
        JsonObject message = new JsonObject();
        message.addProperty("role", "user");
        message.addProperty("content", normalPrefix + text);
        JsonArray array = new JsonArray();
        array.add(message);
        jsonObject.add("messages", array);

        return jsonObject.toString();
    }
}
