package br.com.eduit.crm;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

// Pedidos de RECORD_AUDIO/CAMERA em runtime (getUserMedia dentro do WebView)
// já são tratados pelo BridgeWebChromeClient do Capacitor 6+ via
// onPermissionRequest, desde que a permissão exista no AndroidManifest.
// Nenhum código extra é necessário aqui — o bridge intercepta o prompt do
// WebView e repassa pro diálogo nativo de permissão do Android.
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // registerPlugin precisa rodar ANTES de super.onCreate — é nesse
    // ponto que a Bridge é criada e lê a lista de plugins registrados
    // (ver AGENT.md § Atualizar sem APK).
    registerPlugin(AppUpdatePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
