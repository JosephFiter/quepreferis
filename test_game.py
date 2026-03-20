from playwright.sync_api import sync_playwright
import time
import os

def test_game_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Abrir 3 páginas (jugadores)
        p1 = context.new_page()
        p2 = context.new_page()
        p3 = context.new_page()

        print(">> Host (P1) creando partida...")
        p1.goto("http://localhost:5173")
        p1.wait_for_timeout(1000)
        p1.locator("text=Crear lobby privado").click()
        p1.locator("input#playerName").fill("P1-Host")
        p1.locator("button:has-text('Continuar')").click()
        p1.wait_for_timeout(2000)

        # Extraer el código de la sala
        room_code_element = p1.locator("span.text-4xl.font-black").first
        room_code = room_code_element.text_content()
        print(f">> Sala creada con código: {room_code}")

        print(">> P2 y P3 uniéndose...")
        p2.goto("http://localhost:5173")
        p2.locator("text=Entrar lobby privado").click()
        p2.locator("input#playerName").fill("P2-Guest")
        p2.locator("input#roomCode").fill(room_code)
        p2.locator("button:has-text('Continuar')").click()

        p3.goto("http://localhost:5173")
        p3.locator("text=Entrar lobby privado").click()
        p3.locator("input#playerName").fill("P3-Guest")
        p3.locator("input#roomCode").fill(room_code)
        p3.locator("button:has-text('Continuar')").click()

        p1.wait_for_timeout(2000)

        print(">> Host (P1) iniciando partida con tiempo en 30s...")
        # Cambiar el tiempo a 30s para testear más rápido
        p1.locator("select").select_option(value="30")
        p1.wait_for_timeout(500)
        p1.locator("button:has-text('Iniciar Partida')").click()

        p1.wait_for_timeout(2000)

        print(">> Escribiendo opciones (Fase 1)...")
        for i, page in enumerate([p1, p2, p3]):
            expect_text = page.locator("text=¿Qué preferís?")
            expect_text.wait_for()
            textareas = page.locator("textarea")
            textareas.nth(0).fill(f"Opcion A de P{i+1}")
            textareas.nth(1).fill(f"Opcion B de P{i+1}")
            page.locator("button:has-text('¡Listo!')").click()

        print(">> Esperando a que el timer force el pase a votación (debería saltar al terminar los 30s)...")
        # Vamos a monitorear la fase en la que está P1
        for sec in range(40):
            try:
                votacion_text = p1.locator("text=¡A VOTAR!")
                if votacion_text.is_visible(timeout=500):
                    print(f">> [SEGUNDO {sec}] ¡Llegamos a la fase de votación!")
                    break
            except:
                pass
            time.sleep(1)

        print(">> Monitoreando qué preguntas aparecen y si saltea...")
        for i in range(3):
            time.sleep(2)
            try:
                # Ver el index actual
                pregunta_header = p1.locator("div.inline-flex.bg-neutral-800").text_content()
                print(f"[{i}] Vemos en P1: {pregunta_header}")

                # P2 Vota la opción A
                if p2.locator("text=Opción A").is_visible():
                    print("P2 vota A")
                    # Intenta votar si no está deshabilitado
                    try:
                        p2.locator("button", has_text="Opción A").click(timeout=1000)
                    except:
                        pass
            except Exception as e:
                print(f"Error monitoreando: {e}")

            # Esperar a la próxima (deberían ser 20s)
            print("Esperando 22s a que pase la pregunta...")
            time.sleep(22)

        print(">> Testeando si P3 saliendo da pantalla negra al final de ronda...")
        p3.close()
        print("P3 cerrado.")

        time.sleep(5)
        try:
            ranking_text = p1.locator("text=Resultados de la Ronda").text_content()
            print(f"Ranking en P1: {ranking_text}")
        except Exception as e:
            print("No se encontró el texto de ranking, o hubo pantalla negra.")
            p1.screenshot(path="p1_crash.png")

        browser.close()

if __name__ == "__main__":
    test_game_flow()