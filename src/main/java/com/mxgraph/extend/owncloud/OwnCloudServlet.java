package com.mxgraph.extend.owncloud;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mxgraph.extend.MultiReadHttpServletRequest;
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

    private String CONFIG_PATH = "owncloud.properties";

    public String SERVICE_URL = null;

    public String ADMIN_EMAIL = null;

    public String ADMIN_PASSWORD = null;

    public String TOKEN = null;

    @Override
    public void init() throws ServletException {
        try {
            Properties properties = getProperties(CONFIG_PATH, getServletContext());
            SERVICE_URL = properties.getProperty("serviceUrl");
            ADMIN_EMAIL = properties.getProperty("adminEmail");
            ADMIN_PASSWORD = properties.getProperty("adminPassword");
            TOKEN = getToken(SERVICE_URL, ADMIN_EMAIL, ADMIN_PASSWORD);
//            System.out.println("token:" + TOKEN);
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
            String token = getToken(SERVICE_URL, email, password);
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
            URL url = new URL(SERVICE_URL + "/api/v2.1/admin/users/" + email);
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
            URL url = new URL(SERVICE_URL + "/api/v2.1/admin/users/");
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

    public String getToken(String serviceUrl, String email, String password) {
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

    // 通过proxyServlet调用
    public static void loadFile(HttpServletRequest request, HttpServletResponse response) {
        HttpURLConnection httpConn = null;
        try {
            Map<String, String> params = parseQueryString(request.getParameter("url"));
            String chartId = params.get("chartId");

            URL url = new URL("https://cloud.tianyansystem.com/f/" + chartId + "/?dl=1");
            httpConn = (HttpURLConnection) url.openConnection();
            httpConn.setRequestMethod("GET");
            httpConn.setRequestProperty("Cookie", request.getHeader("cookie"));
            SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

//            System.out.println("cookie" + request.getHeader("cookie"));

            int responseCode = httpConn.getResponseCode();
            if (responseCode == HttpServletResponse.SC_MOVED_PERMANENTLY
                    || responseCode == HttpServletResponse.SC_MOVED_TEMPORARILY) {
                // 获取重定向的URL
                String redirectUrl = httpConn.getHeaderField("Location");
                URL newUrl = new URL(redirectUrl);

                httpConn.disconnect();
                httpConn = (HttpURLConnection) newUrl.openConnection();
                httpConn.setRequestMethod("GET");
                httpConn.setRequestProperty("Cookie", request.getHeader("cookie"));
                SkipSSLVerification.trustAllHosts((HttpsURLConnection) httpConn);

                responseCode = httpConn.getResponseCode();
            }
            if (responseCode == HttpServletResponse.SC_OK) {
                response.setStatus(HttpServletResponse.SC_OK);
                Map<String, List<String>> headers = httpConn.getHeaderFields();
                for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                    String headerName = entry.getKey();
                    for (String headerValue : entry.getValue()) {
                        response.addHeader(headerName, headerValue);
                    }
                }

//                System.out.println(httpConn.getHeaderField("content-disposition"));

                InputStream in = httpConn.getInputStream();
                OutputStream out = response.getOutputStream();

                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }

                out.flush();
                out.close();
                in.close();

                return;
            }

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (httpConn != null) {
                httpConn.disconnect();
            }
        }
        // fail
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    public Properties getProperties(String key, ServletContext servletContext) throws IOException {
        InputStream inputStream = servletContext.getResourceAsStream("/WEB-INF/" + key);

        Properties props = new Properties();
        try {
            props.load(inputStream);
        } finally {
            // 关闭输入流
            inputStream.close();
        }
        return props;
    }

    public static Map<String, String> parseQueryString(String queryString) throws UnsupportedEncodingException {
        Map<String, String> params = new HashMap<>();
        String[] pairs = queryString.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), "UTF-8");
                String value = URLDecoder.decode(pair.substring(idx + 1), "UTF-8");
                params.put(key, value);
            }
        }
        return params;
    }

}
