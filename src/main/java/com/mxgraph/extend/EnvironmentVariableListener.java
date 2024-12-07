package com.mxgraph.extend;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import java.io.IOException;
import java.util.Properties;

public class EnvironmentVariableListener implements ServletContextListener {

    public static String CONFIG_PATH = "owncloud.properties";

    public static String OWNCLOUD_SERVICE_URL = null;

    public static String ADMIN_EMAIL = null;

    public static String ADMIN_PASSWORD = null;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        // 设置环境变量
        System.out.println("start server");
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
        System.setProperty("ENABLE_DRAWIO_PROXY", "1");

        // 加载OwnCloud自有云配置信息
        try {
            Properties properties = Utils.getProperties(CONFIG_PATH, sce.getServletContext());
            OWNCLOUD_SERVICE_URL = properties.getProperty("ownCloudServiceUrl");
            ADMIN_EMAIL = properties.getProperty("adminEmail");
            ADMIN_PASSWORD = properties.getProperty("adminPassword");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // 在这里可以进行清理工作
    }
}
