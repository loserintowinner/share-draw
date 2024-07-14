package com.mxgraph.extend.ai.model;

import com.google.gson.Gson;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DifyModel implements GenerateModel {

    public static String CONFIG_PATH = "ai.properties";

    public static String prefix = "dify.";

    public static String AI_SERVICE_URL = null;

    public static String AI_SECRET_KEY = null;

    public static String AI_USER = null;


    static {
        try {
            Properties properties = Utils.getProperties(CONFIG_PATH, EnvironmentVariableListener.servletContext);

            AI_SERVICE_URL = properties.getProperty(prefix + "aiServiceUrl");
            AI_SECRET_KEY = properties.getProperty(prefix + "secretKey");
            AI_USER = properties.getProperty(prefix + "user");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public String generate(String text) throws Exception {
        // 设置URL
        URL url = new URL(AI_SERVICE_URL);
        // 打开连接
        HttpURLConnection httpConn = (HttpURLConnection) url.openConnection();

        // 设置请求方法
        httpConn.setRequestMethod("POST");
        httpConn.setDoOutput(true);

        // 设置请求头
        httpConn.setRequestProperty("Authorization", "Bearer " + AI_SECRET_KEY);
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

    private String createJsonInput(String context) {
        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("response_mode", "blocking");
        jsonObject.addProperty("user", AI_USER);
        JsonObject inputs = new JsonObject();
        inputs.addProperty("context", normalPrefix + context);
        jsonObject.add("inputs", inputs);

        return jsonObject.toString();
    }
}
