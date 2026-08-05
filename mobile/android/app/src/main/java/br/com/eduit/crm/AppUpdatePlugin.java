package br.com.eduit.crm;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * "Atualizar sem APK" (ver AGENT.md § Atualizar sem APK) — atualização
 * nativa da casca Capacitor fora da Play Store.
 *
 * Baixa o APK publicado em `mobile-release.json` (Camada B: só quando a
 * casca nativa muda — permissões, plugins, ícone) e entrega pro
 * instalador do sistema via FileProvider. Requer que o usuário tenha
 * concedido "instalar apps desconhecidos" para este app (Android 8+).
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void getNativeVersion(PluginCall call) {
        try {
            PackageInfo info = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);

            JSObject result = new JSObject();
            result.put("versionCode", getVersionCode(info));
            result.put("versionName", info.versionName != null ? info.versionName : "");
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Não foi possível ler a versão instalada do app.", e);
        }
    }

    private long getVersionCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return info.getLongVersionCode();
        }
        return info.versionCode;
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject result = new JSObject();
        result.put("value", canInstall);
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("URL do APK não informada.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("Permissão para instalar apps desconhecidos não concedida.");
            return;
        }

        // Download roda em thread própria — @PluginMethod não garante thread
        // de fundo em todas as versões do bridge, e a instalação de rede
        // síncrona aqui poderia travar a UI.
        new Thread(() -> downloadAndLaunchInstaller(call, url)).start();
    }

    private void downloadAndLaunchInstaller(PluginCall call, String url) {
        File outputFile = new File(getContext().getCacheDir(), "eduit-crm-update.apk");

        try {
            URL downloadUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) downloadUrl.openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                call.reject("Falha ao baixar a atualização (HTTP " + responseCode + ").");
                return;
            }

            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(outputFile)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                }
            }
        } catch (Exception e) {
            call.reject("Falha ao baixar a atualização: " + e.getMessage(), e);
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Não foi possível abrir o instalador.");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    outputFile
                );

                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(apkUri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                getContext().startActivity(install);
                call.resolve();
            } catch (Exception e) {
                call.reject("Não foi possível abrir o instalador: " + e.getMessage(), e);
            }
        });
    }
}
