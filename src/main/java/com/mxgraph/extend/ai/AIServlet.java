package com.mxgraph.extend.ai;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mxgraph.extend.MultiReadHttpServletRequest;
import com.mxgraph.extend.Utils;
import com.mxgraph.extend.ai.model.DifyModel;
import com.mxgraph.extend.ai.model.SparkModel;
import com.mxgraph.extend.owncloud.OwnCloudServlet;
import org.apache.commons.lang3.StringEscapeUtils;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AIServlet extends HttpServlet {

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) {
        String url = request.getRequestURI().replace("//", "/");
//        System.out.println(url);
        if (url.endsWith("/ai/generate")) {
            generate(request, response);
        } else if (url.endsWith("/ai/generateLink")) {
            generateLink(request, response);
        }
    }

    public void generate(HttpServletRequest request, HttpServletResponse response) {
        try {
            byte[] body = ((MultiReadHttpServletRequest) request).getBody();
            Gson gson = new Gson();
            JsonElement jsonElement = gson.fromJson(new String(body, StandardCharsets.UTF_8), JsonElement.class);
            String context = jsonElement.getAsJsonObject().get("context").getAsString();
            String model = jsonElement.getAsJsonObject().get("model").getAsString();

            GenerateModel generateModel = null;

            // 大模型生成
            if (model.equals("spark")) {
                generateModel = new SparkModel();
            } else if (model.equals("dify")) {
                generateModel = new DifyModel();
            }

            String res = generateModel.generate(context);
            String data = StringEscapeUtils.unescapeJava(Utils.extractMermaidContent(res));

            OutputStream out = response.getOutputStream();

            if (data != null && data.length() > 0) {
                System.out.println(data);

                response.setStatus(HttpServletResponse.SC_OK);
                response.setContentType("application/json;charset=utf-8");

                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("code", 200);
                jsonObject.addProperty("data", data);
                jsonObject.addProperty("message", "success");

                out.write(jsonObject.toString().getBytes("utf-8"));
            } else {
                System.out.println(res);
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                out.write(res.getBytes(StandardCharsets.UTF_8));
            }

            out.flush();
            out.close();
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            e.printStackTrace();
        }
    }

    public void generateLink(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Ai生成流程图并生成共享链接
            byte[] body = ((MultiReadHttpServletRequest) request).getBody();
            System.out.println(new String(body,StandardCharsets.UTF_8));
            Gson gson = new Gson();
            JsonElement jsonElement = gson.fromJson(new String(body, StandardCharsets.UTF_8), JsonElement.class);
            if (jsonElement.isJsonObject()) {
                String data = jsonElement.getAsJsonObject().get("data").getAsString();
                String filename = jsonElement.getAsJsonObject().get("filename").getAsString();
                System.out.println(filename);
                System.out.println(data);

                SparkModel sparkServlet = new SparkModel();

                String res = sparkServlet.generate(data);
                data = StringEscapeUtils.unescapeJava(Utils.extractMermaidContent(res));

                OwnCloudServlet ownCloudServlet = new OwnCloudServlet();

                String repositoryId = ownCloudServlet.getShareRepositoryId();
                String path = "/";

                String token = ownCloudServlet.doSaveAndShare(repositoryId, path, data, filename);

                if (token == null) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                } else {
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType("application/json;charset=utf-8");

                    JsonObject jsonObject = new JsonObject();
                    jsonObject.addProperty("token", "?title=" + filename + "#MchartId=" + token);
                    System.out.println(jsonObject);

                    OutputStream out = response.getOutputStream();
                    out.write(jsonObject.toString().getBytes("utf-8"));
                    out.flush();
                    out.close();
                }

            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
